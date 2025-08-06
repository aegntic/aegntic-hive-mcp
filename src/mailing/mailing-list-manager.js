/**
 * Mailing List Manager
 * Handles email marketing automation with ConvertKit integration
 * Supports user onboarding, feature updates, and engagement campaigns
 */

const EventEmitter = require('events');
const crypto = require('crypto');

class MailingListManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      provider: config.provider || 'convertkit', // 'convertkit', 'mailchimp', 'sendgrid'
      apiKey: config.apiKey || process.env.CONVERTKIT_API_KEY,
      apiSecret: config.apiSecret || process.env.CONVERTKIT_API_SECRET,
      baseUrl: config.baseUrl || 'https://api.convertkit.com/v3',
      defaultTags: config.defaultTags || ['aegntic-hive-mcp'],
      autoSequences: config.autoSequences !== false,
      doubleOptIn: config.doubleOptIn !== false,
      gdprCompliant: config.gdprCompliant !== false,
      ...config
    };
    
    // Email lists for different user segments
    this.lists = {
      newUsers: config.newUsersListId || process.env.CONVERTKIT_NEW_USERS_LIST,
      proUsers: config.proUsersListId || process.env.CONVERTKIT_PRO_USERS_LIST,
      enterprise: config.enterpriseListId || process.env.CONVERTKIT_ENTERPRISE_LIST,
      newsletter: config.newsletterListId || process.env.CONVERTKIT_NEWSLETTER_LIST,
      productUpdates: config.productUpdatesListId || process.env.CONVERTKIT_UPDATES_LIST
    };
    
    // Email sequences for automation
    this.sequences = {
      onboarding: config.onboardingSequenceId || process.env.CONVERTKIT_ONBOARDING_SEQUENCE,
      trialFollowup: config.trialFollowupSequenceId || process.env.CONVERTKIT_TRIAL_SEQUENCE,
      featureEducation: config.featureEducationSequenceId || process.env.CONVERTKIT_EDUCATION_SEQUENCE,
      upgradeSequence: config.upgradeSequenceId || process.env.CONVERTKIT_UPGRADE_SEQUENCE,
      winback: config.winbackSequenceId || process.env.CONVERTKIT_WINBACK_SEQUENCE
    };
    
    // Subscriber tracking
    this.subscriberCache = new Map();
    this.rateLimiting = new Map();
    
    this.initialize();
  }
  
  async initialize() {
    try {
      // Validate API configuration
      await this.validateConfiguration();
      
      this.emit('mailing:initialized', {
        provider: this.config.provider,
        listsConfigured: Object.keys(this.lists).length,
        sequencesConfigured: Object.keys(this.sequences).length
      });
      
    } catch (error) {
      this.emit('mailing:initialization_failed', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Subscribe user to mailing list with comprehensive setup
   */
  async subscribeUser(userData) {
    const { email, fullName, source = 'signup', planType = 'free', preferences = {} } = userData;
    
    try {
      // Validate input
      if (!email || !this.isValidEmail(email)) {
        throw new Error('Valid email address is required');
      }
      
      // Check rate limiting
      this.checkRateLimit(email);
      
      this.emit('mailing:subscription_started', { email, source });
      
      // Prepare subscriber data
      const subscriberData = {
        email,
        first_name: this.extractFirstName(fullName),
        fields: {
          full_name: fullName || '',
          plan_type: planType,
          signup_source: source,
          signup_date: new Date().toISOString(),
          preferences: JSON.stringify(preferences)
        }
      };
      
      // Add tags based on plan type and source
      const tags = [...this.config.defaultTags];
      tags.push(`plan-${planType}`);
      tags.push(`source-${source}`);
      
      if (preferences.interests) {
        tags.push(...preferences.interests.map(interest => `interest-${interest}`));
      }
      
      // Subscribe to appropriate lists
      const subscriptionPromises = [];
      
      // Always add to newsletter if not opted out
      if (preferences.newsletter !== false) {
        subscriptionPromises.push(
          this.addToList(this.lists.newsletter, subscriberData, tags)
        );
      }
      
      // Add to plan-specific lists
      if (planType === 'pro') {
        subscriptionPromises.push(
          this.addToList(this.lists.proUsers, subscriberData, tags)
        );
      } else if (planType === 'enterprise') {
        subscriptionPromises.push(
          this.addToList(this.lists.enterprise, subscriberData, tags)
        );
      } else {
        subscriptionPromises.push(
          this.addToList(this.lists.newUsers, subscriberData, tags)
        );
      }
      
      // Product updates list (unless explicitly opted out)
      if (preferences.productUpdates !== false) {
        subscriptionPromises.push(
          this.addToList(this.lists.productUpdates, subscriberData, tags)
        );
      }
      
      // Execute all subscriptions in parallel
      await Promise.all(subscriptionPromises);
      
      // Start automation sequences
      if (this.config.autoSequences) {
        await this.startAutomationSequences(email, planType, source);
      }
      
      // Cache subscriber info
      this.subscriberCache.set(email, {
        ...subscriberData,
        tags,
        subscribedAt: Date.now(),
        planType,
        source
      });
      
      this.recordRateLimit(email);
      
      this.emit('mailing:subscription_success', {
        email,
        planType,
        listsAdded: subscriptionPromises.length,
        tags
      });
      
      return {
        success: true,
        subscriber: {
          email,
          fullName,
          planType,
          listsSubscribed: subscriptionPromises.length,
          tags
        }
      };
      
    } catch (error) {
      this.emit('mailing:subscription_failed', {
        email,
        source,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Update subscriber when plan changes
   */
  async updateSubscriberPlan(email, newPlanType, oldPlanType = 'free') {
    try {
      this.emit('mailing:plan_update_started', { email, newPlanType, oldPlanType });
      
      // Get existing subscriber data
      const subscriber = await this.getSubscriber(email);
      if (!subscriber) {
        throw new Error('Subscriber not found');
      }
      
      // Update subscriber fields
      const updateData = {
        fields: {
          ...subscriber.fields,
          plan_type: newPlanType,
          plan_updated_date: new Date().toISOString(),
          previous_plan: oldPlanType
        }
      };
      
      // Update tags
      const newTags = [`plan-${newPlanType}`, `upgraded-from-${oldPlanType}`];
      
      // Add to new plan-specific list
      if (newPlanType === 'pro' && oldPlanType === 'free') {
        await this.addToList(this.lists.proUsers, { email, ...updateData }, newTags);
        await this.startUpgradeSequence(email, 'pro');
      } else if (newPlanType === 'enterprise') {
        await this.addToList(this.lists.enterprise, { email, ...updateData }, newTags);
        await this.startUpgradeSequence(email, 'enterprise');
      }
      
      // Remove old plan tags and add new ones
      await this.updateSubscriberTags(email, [`plan-${oldPlanType}`], newTags);
      
      // Send plan change confirmation email
      await this.sendPlanChangeEmail(email, newPlanType, oldPlanType);
      
      this.emit('mailing:plan_update_success', {
        email,
        newPlanType,
        oldPlanType
      });
      
      return { success: true };
      
    } catch (error) {
      this.emit('mailing:plan_update_failed', {
        email,
        newPlanType,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Send feature announcement to relevant segments
   */
  async sendFeatureAnnouncement(announcement) {
    const { title, content, targetPlans = ['free', 'pro', 'enterprise'], tags = [] } = announcement;
    
    try {
      this.emit('mailing:announcement_started', { title, targetPlans });
      
      // Create broadcast
      const broadcast = await this.createBroadcast({
        subject: title,
        content,
        tags: [`plan-${targetPlans.join('|plan-')}`, ...tags]
      });
      
      // Send to each target plan
      const sendPromises = targetPlans.map(plan =>
        this.sendBroadcastToList(this.getListByPlan(plan), broadcast)
      );
      
      const results = await Promise.all(sendPromises);
      
      this.emit('mailing:announcement_sent', {
        title,
        targetPlans,
        recipientCount: results.reduce((sum, result) => sum + (result.recipientCount || 0), 0)
      });
      
      return {
        success: true,
        announcementId: broadcast.id,
        targetPlans,
        results
      };
      
    } catch (error) {
      this.emit('mailing:announcement_failed', {
        title,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Track user engagement for email optimization
   */
  async trackEngagement(email, event, data = {}) {
    try {
      const engagement = {
        email,
        event, // 'opened', 'clicked', 'unsubscribed', 'complained'
        timestamp: Date.now(),
        ...data
      };
      
      // Update subscriber profile based on engagement
      await this.updateSubscriberEngagement(email, engagement);
      
      // Trigger engagement-based sequences
      if (event === 'clicked' && data.linkType === 'upgrade') {
        await this.startUpgradeSequence(email, 'interest-shown');
      } else if (event === 'unsubscribed') {
        await this.startWinbackSequence(email);
      }
      
      this.emit('mailing:engagement_tracked', engagement);
      
    } catch (error) {
      this.emit('mailing:engagement_failed', {
        email,
        event,
        error: error.message
      });
    }
  }
  
  /**
   * ConvertKit API integration methods
   */
  async addToList(listId, subscriberData, tags = []) {
    if (!listId) {
      throw new Error('List ID is required');
    }
    
    const payload = {
      email: subscriberData.email,
      first_name: subscriberData.first_name,
      fields: subscriberData.fields || {},
      tags: tags
    };
    
    const response = await this.makeApiRequest('POST', `/forms/${listId}/subscribe`, payload);
    
    return response;
  }
  
  async getSubscriber(email) {
    try {
      const response = await this.makeApiRequest('GET', `/subscribers`, {
        email_address: email
      });
      
      return response.subscribers && response.subscribers.length > 0
        ? response.subscribers[0]
        : null;
    } catch (error) {
      if (error.message.includes('404')) {
        return null; // Subscriber not found
      }
      throw error;
    }
  }
  
  async updateSubscriberTags(email, removeTags = [], addTags = []) {
    const subscriber = await this.getSubscriber(email);
    if (!subscriber) {
      throw new Error('Subscriber not found');
    }
    
    // Remove tags
    if (removeTags.length > 0) {
      await this.makeApiRequest('DELETE', `/subscribers/${subscriber.id}/tags`, {
        tags: removeTags
      });
    }
    
    // Add tags
    if (addTags.length > 0) {
      await this.makeApiRequest('POST', `/subscribers/${subscriber.id}/tags`, {
        tags: addTags
      });
    }
  }
  
  async startAutomationSequences(email, planType, source) {
    const sequences = [];
    
    // Onboarding sequence for all new users
    if (this.sequences.onboarding) {
      sequences.push(this.addToSequence(email, this.sequences.onboarding));
    }
    
    // Trial follow-up for free users
    if (planType === 'free' && this.sequences.trialFollowup) {
      sequences.push(this.addToSequence(email, this.sequences.trialFollowup));
    }
    
    // Feature education for all users
    if (this.sequences.featureEducation) {
      sequences.push(this.addToSequence(email, this.sequences.featureEducation));
    }
    
    await Promise.all(sequences);
  }
  
  async addToSequence(email, sequenceId) {
    if (!sequenceId) return;
    
    await this.makeApiRequest('POST', `/sequences/${sequenceId}/subscribe`, {
      email
    });
  }
  
  async startUpgradeSequence(email, upgradeType) {
    if (this.sequences.upgradeSequence) {
      await this.addToSequence(email, this.sequences.upgradeSequence);
      
      // Add specific tag for this upgrade type
      await this.updateSubscriberTags(email, [], [`upgrade-${upgradeType}`]);
    }
  }
  
  async startWinbackSequence(email) {
    if (this.sequences.winback) {
      // Wait 30 days before starting winback
      setTimeout(async () => {
        try {
          await this.addToSequence(email, this.sequences.winback);
        } catch (error) {
          this.emit('mailing:winback_failed', { email, error: error.message });
        }
      }, 30 * 24 * 60 * 60 * 1000);
    }
  }
  
  async createBroadcast(broadcastData) {
    return await this.makeApiRequest('POST', '/broadcasts', broadcastData);
  }
  
  async sendBroadcastToList(listId, broadcast) {
    return await this.makeApiRequest('POST', `/broadcasts/${broadcast.id}/send`, {
      list_id: listId
    });
  }
  
  /**
   * API request helper
   */
  async makeApiRequest(method, endpoint, data = {}) {
    const url = `${this.config.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    // Add API key to request
    if (method === 'GET') {
      const params = new URLSearchParams({
        ...data,
        api_key: this.config.apiKey
      });
      url += `?${params.toString()}`;
    } else {
      options.body = JSON.stringify({
        ...data,
        api_key: this.config.apiKey
      });
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`ConvertKit API error: ${response.status} - ${errorData.message || response.statusText}`);
    }
    
    return await response.json();
  }
  
  /**
   * Email sending for transactional messages
   */
  async sendPlanChangeEmail(email, newPlan, oldPlan) {
    // This would integrate with a transactional email service
    // For now, we'll emit an event that can be handled elsewhere
    this.emit('mailing:send_transactional', {
      template: 'plan_change_confirmation',
      to: email,
      data: { newPlan, oldPlan }
    });
  }
  
  async updateSubscriberEngagement(email, engagement) {
    const subscriber = this.subscriberCache.get(email);
    if (subscriber) {
      subscriber.lastEngagement = engagement;
      subscriber.engagementScore = this.calculateEngagementScore(subscriber);
      this.subscriberCache.set(email, subscriber);
    }
  }
  
  /**
   * Utility methods
   */
  validateConfiguration() {
    if (!this.config.apiKey) {
      throw new Error('ConvertKit API key is required');
    }
    
    const requiredLists = ['newsletter', 'newUsers'];
    const missingLists = requiredLists.filter(list => !this.lists[list]);
    
    if (missingLists.length > 0) {
      throw new Error(`Missing required list configurations: ${missingLists.join(', ')}`);
    }
  }
  
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  extractFirstName(fullName) {
    if (!fullName) return '';
    return fullName.split(' ')[0];
  }
  
  getListByPlan(planType) {
    const planToList = {
      free: this.lists.newUsers,
      pro: this.lists.proUsers,
      enterprise: this.lists.enterprise
    };
    
    return planToList[planType] || this.lists.newUsers;
  }
  
  calculateEngagementScore(subscriber) {
    // Simple engagement scoring algorithm
    let score = 50; // Base score
    
    if (subscriber.lastEngagement) {
      switch (subscriber.lastEngagement.event) {
        case 'opened':
          score += 10;
          break;
        case 'clicked':
          score += 20;
          break;
        case 'unsubscribed':
          score -= 50;
          break;
        case 'complained':
          score -= 100;
          break;
      }
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Rate limiting
   */
  checkRateLimit(email) {
    const now = Date.now();
    const attempts = this.rateLimiting.get(email) || [];
    
    // Allow max 2 subscriptions per hour per email
    const recentAttempts = attempts.filter(time => now - time < 60 * 60 * 1000);
    
    if (recentAttempts.length >= 2) {
      throw new Error('Too many subscription attempts. Please try again later.');
    }
    
    this.rateLimiting.set(email, recentAttempts);
  }
  
  recordRateLimit(email) {
    const attempts = this.rateLimiting.get(email) || [];
    attempts.push(Date.now());
    this.rateLimiting.set(email, attempts);
  }
  
  /**
   * Cleanup
   */
  cleanup() {
    this.subscriberCache.clear();
    this.rateLimiting.clear();
    this.removeAllListeners();
  }
}

module.exports = MailingListManager;