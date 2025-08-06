/**
 * Serverless Authentication Manager
 * Handles user authentication, registration, and session management
 * Integrates with Supabase Auth and mailing list signup
 */

const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const EventEmitter = require('events');

class ServerlessAuthManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      supabaseUrl: config.supabaseUrl || process.env.SUPABASE_URL,
      supabaseKey: config.supabaseKey || process.env.SUPABASE_ANON_KEY,
      jwtSecret: config.jwtSecret || process.env.JWT_SECRET,
      apiUrl: config.apiUrl || process.env.AEGNTIC_API_URL,
      requireEmailVerification: config.requireEmailVerification !== false,
      autoSubscribeNewsletter: config.autoSubscribeNewsletter !== false,
      sessionDuration: config.sessionDuration || 24 * 60 * 60 * 1000, // 24 hours
      refreshThreshold: config.refreshThreshold || 60 * 60 * 1000, // 1 hour before expiry
      ...config
    };
    
    // Initialize Supabase client
    this.supabase = createClient(this.config.supabaseUrl, this.config.supabaseKey);
    
    // User session management
    this.currentUser = null;
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiresAt = null;
    
    // Rate limiting for auth attempts
    this.authAttempts = new Map();
    this.maxAttemptsPerHour = 5;
    
    this.initialize();
  }
  
  async initialize() {
    try {
      // Check for existing session
      await this.loadStoredSession();
      
      // Setup token refresh timer
      this.setupTokenRefresh();
      
      this.emit('auth:initialized', { hasSession: !!this.currentUser });
      
    } catch (error) {
      this.emit('auth:initialization_failed', { error: error.message });
    }
  }
  
  /**
   * Register new user with email and optional details
   */
  async signUp(userData) {
    const { email, fullName, agreeToTerms, subscribeNewsletter = true } = userData;
    
    try {
      // Validate input
      if (!email || !this.isValidEmail(email)) {
        throw new Error('Valid email address is required');
      }
      
      if (!agreeToTerms) {
        throw new Error('Must agree to terms and conditions');
      }
      
      // Check rate limiting
      this.checkRateLimit(email);
      
      this.emit('auth:signup_started', { email });
      
      // Sign up with Supabase
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password: this.generateSecurePassword(), // Passwordless - we'll use magic links
        options: {
          data: {
            full_name: fullName,
            plan_type: 'free',
            agreed_to_terms: true,
            subscribe_newsletter: subscribeNewsletter
          },
          emailRedirectTo: `${this.config.apiUrl}/auth/callback`
        }
      });
      
      if (error) {
        throw new Error(`Signup failed: ${error.message}`);
      }
      
      // Create user profile
      const userProfile = {
        id: data.user.id,
        email: data.user.email,
        fullName: fullName || '',
        planType: 'free',
        createdAt: new Date().toISOString(),
        usageStats: {
          conversationsThisMonth: 0,
          storageUsedMB: 0,
          lastActiveDate: new Date().toISOString()
        }
      };
      
      // Subscribe to mailing list if requested
      if (subscribeNewsletter) {
        await this.subscribeToMailingList(email, fullName);
      }
      
      // Send welcome email
      await this.sendWelcomeEmail(userProfile);
      
      this.emit('auth:signup_success', {
        userId: userProfile.id,
        email: userProfile.email,
        requiresVerification: this.config.requireEmailVerification
      });
      
      return {
        success: true,
        user: userProfile,
        requiresEmailVerification: this.config.requireEmailVerification,
        message: this.config.requireEmailVerification
          ? 'Please check your email to verify your account'
          : 'Account created successfully'
      };
      
    } catch (error) {
      this.recordAuthAttempt(email, false);
      this.emit('auth:signup_failed', { email, error: error.message });
      throw error;
    }
  }
  
  /**
   * Sign in user with email (passwordless)
   */
  async signIn(email, options = {}) {
    try {
      if (!email || !this.isValidEmail(email)) {
        throw new Error('Valid email address is required');
      }
      
      // Check rate limiting
      this.checkRateLimit(email);
      
      this.emit('auth:signin_started', { email });
      
      // Send magic link
      const { data, error } = await this.supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${this.config.apiUrl}/auth/callback`,
          shouldCreateUser: false // Don't auto-create users
        }
      });
      
      if (error) {
        throw new Error(`Sign in failed: ${error.message}`);
      }
      
      this.emit('auth:signin_link_sent', { email });
      
      return {
        success: true,
        message: 'Check your email for a sign-in link',
        linkSent: true
      };
      
    } catch (error) {
      this.recordAuthAttempt(email, false);
      this.emit('auth:signin_failed', { email, error: error.message });
      throw error;
    }
  }
  
  /**
   * Handle callback from email verification/magic link
   */
  async handleAuthCallback(tokens) {
    try {
      const { access_token, refresh_token, expires_in } = tokens;
      
      // Verify and decode token
      const payload = jwt.decode(access_token);
      if (!payload) {
        throw new Error('Invalid token');
      }
      
      // Get user profile from Supabase
      const { data: { user }, error } = await this.supabase.auth.getUser(access_token);
      if (error || !user) {
        throw new Error('Failed to get user profile');
      }
      
      // Create session
      this.currentUser = {
        id: user.id,
        email: user.email,
        fullName: user.user_metadata?.full_name || '',
        planType: user.user_metadata?.plan_type || 'free',
        emailVerified: user.email_confirmed_at !== null,
        createdAt: user.created_at
      };
      
      this.accessToken = access_token;
      this.refreshToken = refresh_token;
      this.tokenExpiresAt = Date.now() + (expires_in * 1000);
      
      // Store session locally
      await this.storeSession();
      
      // Update last active time
      await this.updateLastActive();
      
      this.emit('auth:signin_success', {
        user: this.currentUser,
        sessionDuration: expires_in
      });
      
      return {
        success: true,
        user: this.currentUser,
        accessToken: this.accessToken
      };
      
    } catch (error) {
      this.emit('auth:callback_failed', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Sign out user
   */
  async signOut() {
    try {
      if (this.refreshToken) {
        // Revoke session on server
        await this.supabase.auth.signOut();
      }
      
      // Clear local session
      this.currentUser = null;
      this.accessToken = null;
      this.refreshToken = null;
      this.tokenExpiresAt = null;
      
      await this.clearStoredSession();
      
      this.emit('auth:signout_success');
      
      return { success: true };
      
    } catch (error) {
      this.emit('auth:signout_failed', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Get current user profile
   */
  async getCurrentUser() {
    if (!this.currentUser) {
      return null;
    }
    
    // Check if token needs refresh
    if (this.needsTokenRefresh()) {
      await this.refreshAccessToken();
    }
    
    return this.currentUser;
  }
  
  /**
   * Update user profile
   */
  async updateProfile(updates) {
    try {
      if (!this.currentUser) {
        throw new Error('Not authenticated');
      }
      
      // Update in Supabase
      const { data, error } = await this.supabase.auth.updateUser({
        data: updates
      });
      
      if (error) {
        throw new Error(`Profile update failed: ${error.message}`);
      }
      
      // Update local user object
      this.currentUser = {
        ...this.currentUser,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      await this.storeSession();
      
      this.emit('auth:profile_updated', {
        userId: this.currentUser.id,
        updates
      });
      
      return {
        success: true,
        user: this.currentUser
      };
      
    } catch (error) {
      this.emit('auth:profile_update_failed', {
        userId: this.currentUser?.id,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Get authentication headers for API requests
   */
  getAuthHeaders() {
    if (!this.accessToken) {
      return {};
    }
    
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'X-User-ID': this.currentUser?.id || ''
    };
  }
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!(this.currentUser && this.accessToken && !this.isTokenExpired());
  }
  
  /**
   * Refresh access token
   */
  async refreshAccessToken() {
    try {
      if (!this.refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const { data, error } = await this.supabase.auth.refreshSession({
        refresh_token: this.refreshToken
      });
      
      if (error || !data.session) {
        throw new Error('Token refresh failed');
      }
      
      this.accessToken = data.session.access_token;
      this.refreshToken = data.session.refresh_token;
      this.tokenExpiresAt = Date.now() + (data.session.expires_in * 1000);
      
      await this.storeSession();
      
      this.emit('auth:token_refreshed', {
        userId: this.currentUser?.id,
        expiresIn: data.session.expires_in
      });
      
    } catch (error) {
      this.emit('auth:token_refresh_failed', { error: error.message });
      // Clear invalid session
      await this.signOut();
      throw error;
    }
  }
  
  /**
   * Subscribe user to mailing list
   */
  async subscribeToMailingList(email, fullName) {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/mailing-list/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          fullName,
          source: 'signup',
          tags: ['aegntic-hive-mcp', 'new-user']
        })
      });
      
      if (!response.ok) {
        throw new Error('Mailing list subscription failed');
      }
      
      this.emit('auth:mailing_list_subscribed', { email });
      
    } catch (error) {
      // Don't fail signup if mailing list fails
      this.emit('auth:mailing_list_failed', { email, error: error.message });
    }
  }
  
  /**
   * Send welcome email
   */
  async sendWelcomeEmail(userProfile) {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/emails/welcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userProfile.email,
          fullName: userProfile.fullName,
          userId: userProfile.id
        })
      });
      
      if (!response.ok) {
        throw new Error('Welcome email failed to send');
      }
      
      this.emit('auth:welcome_email_sent', { email: userProfile.email });
      
    } catch (error) {
      this.emit('auth:welcome_email_failed', {
        email: userProfile.email,
        error: error.message
      });
    }
  }
  
  /**
   * Session management
   */
  async storeSession() {
    if (typeof localStorage !== 'undefined') {
      const session = {
        user: this.currentUser,
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        expiresAt: this.tokenExpiresAt
      };
      
      localStorage.setItem('aegntic_session', JSON.stringify(session));
    }
  }
  
  async loadStoredSession() {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('aegntic_session');
      if (stored) {
        const session = JSON.parse(stored);
        
        if (session.expiresAt > Date.now()) {
          this.currentUser = session.user;
          this.accessToken = session.accessToken;
          this.refreshToken = session.refreshToken;
          this.tokenExpiresAt = session.expiresAt;
          
          // Refresh if needed
          if (this.needsTokenRefresh()) {
            await this.refreshAccessToken();
          }
        }
      }
    }
  }
  
  async clearStoredSession() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('aegntic_session');
    }
  }
  
  /**
   * Token management utilities
   */
  isTokenExpired() {
    return this.tokenExpiresAt && Date.now() >= this.tokenExpiresAt;
  }
  
  needsTokenRefresh() {
    return this.tokenExpiresAt && (Date.now() + this.config.refreshThreshold) >= this.tokenExpiresAt;
  }
  
  setupTokenRefresh() {
    setInterval(async () => {
      if (this.needsTokenRefresh() && this.refreshToken) {
        try {
          await this.refreshAccessToken();
        } catch (error) {
          // Token refresh will handle cleanup
        }
      }
    }, 60000); // Check every minute
  }
  
  /**
   * Rate limiting
   */
  checkRateLimit(email) {
    const now = Date.now();
    const attempts = this.authAttempts.get(email) || [];
    
    // Clean old attempts (older than 1 hour)
    const recentAttempts = attempts.filter(time => now - time < 60 * 60 * 1000);
    
    if (recentAttempts.length >= this.maxAttemptsPerHour) {
      throw new Error('Too many authentication attempts. Please try again later.');
    }
    
    this.authAttempts.set(email, recentAttempts);
  }
  
  recordAuthAttempt(email, success) {
    const attempts = this.authAttempts.get(email) || [];
    attempts.push(Date.now());
    this.authAttempts.set(email, attempts);
  }
  
  /**
   * Utility functions
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  generateSecurePassword() {
    return crypto.randomBytes(32).toString('hex');
  }
  
  async updateLastActive() {
    try {
      if (this.currentUser) {
        // Update in Supabase
        const { error } = await this.supabase
          .from('users')
          .update({ last_active: new Date().toISOString() })
          .eq('id', this.currentUser.id);
        
        if (!error) {
          this.currentUser.lastActiveDate = new Date().toISOString();
        }
      }
    } catch (error) {
      // Non-critical error
      this.emit('auth:last_active_update_failed', { error: error.message });
    }
  }
  
  /**
   * Get user usage statistics
   */
  async getUsageStats() {
    try {
      if (!this.currentUser) {
        return null;
      }
      
      const { data, error } = await this.supabase
        .from('users')
        .select('usage_stats')
        .eq('id', this.currentUser.id)
        .single();
      
      if (error) {
        throw new Error('Failed to get usage stats');
      }
      
      return data.usage_stats;
      
    } catch (error) {
      this.emit('auth:usage_stats_failed', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Cleanup resources
   */
  cleanup() {
    // Clear any intervals or timeouts
    this.removeAllListeners();
  }
}

module.exports = ServerlessAuthManager;