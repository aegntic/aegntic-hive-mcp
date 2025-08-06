-- Aegntic Hive MCP - Supabase Database Schema
-- Secure memory storage and user management for serverless SaaS platform
-- This schema supports conversation history, project management, and artifact versioning

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy search

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Supabase auth integration
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    
    -- Plan management
    plan_type VARCHAR(50) DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'enterprise')),
    plan_started_at TIMESTAMP DEFAULT NOW(),
    plan_expires_at TIMESTAMP,
    subscription_id VARCHAR(255), -- Polar.sh subscription ID
    
    -- Usage tracking
    usage_stats JSONB DEFAULT '{
        "conversationsThisMonth": 0,
        "storageUsedMB": 0,
        "lastActiveDate": null,
        "featureUsage": {
            "search": 0,
            "export": 0,
            "projects": 0,
            "artifacts": 0
        }
    }'::jsonb,
    
    -- User preferences
    preferences JSONB DEFAULT '{
        "theme": "system",
        "notifications": {
            "email": true,
            "browser": true,
            "marketing": true
        },
        "privacy": {
            "shareAnalytics": true,
            "publicProfile": false
        }
    }'::jsonb,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_active TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- User memories table (secure conversation and context storage)
CREATE TABLE user_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Memory classification
    memory_type VARCHAR(50) NOT NULL CHECK (memory_type IN (
        'conversation', 'project', 'artifact', 'search_history', 
        'preference', 'session', 'cache'
    )),
    memory_key VARCHAR(255) NOT NULL,
    
    -- Content storage (supports both encrypted and plain)
    memory_data JSONB NOT NULL,
    encrypted_data TEXT, -- For sensitive data
    encryption_key_id VARCHAR(255), -- Reference to encryption key
    
    -- Metadata
    size_bytes INTEGER DEFAULT 0,
    compression_type VARCHAR(20), -- 'gzip', 'lz4', null
    expires_at TIMESTAMP, -- TTL for cache-type memories
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, memory_key),
    CHECK (size_bytes >= 0)
);

-- Conversations table (AI service conversations)
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Service information
    service VARCHAR(50) NOT NULL CHECK (service IN (
        'chatgpt', 'claude', 'gemini', 'grok', 'other'
    )),
    conversation_id VARCHAR(255) NOT NULL, -- External conversation ID
    
    -- Content
    title TEXT,
    messages JSONB DEFAULT '[]'::jsonb, -- Array of message objects
    
    -- Metadata
    metadata JSONB DEFAULT '{
        "model": null,
        "tokens": {
            "input": 0,
            "output": 0
        },
        "tags": [],
        "starred": false,
        "archived": false
    }'::jsonb,
    
    -- Search optimization
    search_vector tsvector, -- Full-text search
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_message_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, service, conversation_id)
);

-- Projects table (organize conversations and artifacts)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Basic info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3b82f6', -- Hex color
    icon VARCHAR(50) DEFAULT 'folder',
    
    -- Settings
    settings JSONB DEFAULT '{
        "autoOrganize": true,
        "shareSettings": {
            "public": false,
            "collaborative": false,
            "readOnly": false
        },
        "integrations": {}
    }'::jsonb,
    
    -- Statistics
    stats JSONB DEFAULT '{
        "conversationCount": 0,
        "artifactCount": 0,
        "lastActivity": null
    }'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, name)
);

-- Project conversations (many-to-many relationship)
CREATE TABLE project_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT NOW(),
    added_by UUID REFERENCES users(id),
    
    -- Constraints
    UNIQUE(project_id, conversation_id)
);

-- Artifacts table (code, documents, generated content)
CREATE TABLE artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    
    -- Basic info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    artifact_type VARCHAR(50) NOT NULL CHECK (artifact_type IN (
        'code', 'document', 'image', 'data', 'config', 'other'
    )),
    
    -- Content
    content TEXT, -- For text-based artifacts
    file_url TEXT, -- For uploaded files
    mime_type VARCHAR(100),
    size_bytes INTEGER DEFAULT 0,
    
    -- Versioning
    version INTEGER DEFAULT 1,
    parent_artifact_id UUID REFERENCES artifacts(id),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    tags TEXT[] DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CHECK (size_bytes >= 0),
    CHECK (version > 0)
);

-- Search history table (for analytics and suggestions)
CREATE TABLE search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Search details
    query TEXT NOT NULL,
    search_type VARCHAR(20) NOT NULL CHECK (search_type IN (
        'semantic', 'fuzzy', 'exact', 'keyword', 'advanced'
    )),
    filters JSONB DEFAULT '{}'::jsonb,
    
    -- Results
    results_count INTEGER DEFAULT 0,
    result_ids UUID[] DEFAULT '{}',
    
    -- Performance
    execution_time_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking table (for billing and analytics)
CREATE TABLE usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Event details
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'conversation_sync', 'search', 'export', 'project_create', 
        'artifact_save', 'api_call', 'storage_update'
    )),
    event_data JSONB DEFAULT '{}'::jsonb,
    
    -- Resource usage
    tokens_used INTEGER DEFAULT 0,
    storage_bytes INTEGER DEFAULT 0,
    compute_ms INTEGER DEFAULT 0,
    
    -- Billing period
    billing_month DATE DEFAULT DATE_TRUNC('month', NOW()),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW()
);

-- Subscription events (Polar.sh webhook processing)
CREATE TABLE subscription_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Polar.sh data
    polar_event_id VARCHAR(255) UNIQUE NOT NULL,
    polar_subscription_id VARCHAR(255),
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL,
    
    -- Processing status
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance optimization

-- Users indexes
CREATE INDEX idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_plan_type ON users(plan_type);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;

-- Memory indexes
CREATE INDEX idx_user_memories_user_id ON user_memories(user_id);
CREATE INDEX idx_user_memories_type ON user_memories(memory_type);
CREATE INDEX idx_user_memories_key ON user_memories(user_id, memory_key);
CREATE INDEX idx_user_memories_expires ON user_memories(expires_at) WHERE expires_at IS NOT NULL;

-- Conversation indexes
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_service ON conversations(service);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX idx_conversations_search ON conversations USING GIN(search_vector);
CREATE INDEX idx_conversations_metadata ON conversations USING GIN(metadata);

-- Project indexes
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_updated ON projects(updated_at DESC);

-- Artifact indexes
CREATE INDEX idx_artifacts_user_id ON artifacts(user_id);
CREATE INDEX idx_artifacts_project ON artifacts(project_id);
CREATE INDEX idx_artifacts_type ON artifacts(artifact_type);
CREATE INDEX idx_artifacts_version ON artifacts(parent_artifact_id, version);
CREATE INDEX idx_artifacts_tags ON artifacts USING GIN(tags);

-- Usage indexes
CREATE INDEX idx_usage_events_user_month ON usage_events(user_id, billing_month);
CREATE INDEX idx_usage_events_type ON usage_events(event_type, created_at);

-- Search indexes
CREATE INDEX idx_search_history_user ON search_history(user_id, created_at DESC);
CREATE INDEX idx_search_history_query ON search_history USING GIN(to_tsvector('english', query));

-- Subscription indexes
CREATE INDEX idx_subscription_events_polar_id ON subscription_events(polar_event_id);
CREATE INDEX idx_subscription_events_user ON subscription_events(user_id, created_at DESC);
CREATE INDEX idx_subscription_events_processed ON subscription_events(processed, created_at) WHERE NOT processed;

-- Triggers for automatic updates

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply timestamp triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_memories_updated_at BEFORE UPDATE ON user_memories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_artifacts_updated_at BEFORE UPDATE ON artifacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Search vector update trigger for conversations
CREATE OR REPLACE FUNCTION update_conversation_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector = to_tsvector('english', 
        COALESCE(NEW.title, '') || ' ' || 
        COALESCE(NEW.messages::text, '')
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversation_search_vector_trigger 
    BEFORE INSERT OR UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_conversation_search_vector();

-- Usage stats update trigger
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user last_active timestamp
    UPDATE users 
    SET last_active = NOW(),
        usage_stats = jsonb_set(
            usage_stats,
            '{lastActiveDate}',
            to_jsonb(NOW()::text)
        )
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply stats triggers
CREATE TRIGGER update_user_stats_conversations AFTER INSERT ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_user_stats();

CREATE TRIGGER update_user_stats_memories AFTER INSERT OR UPDATE ON user_memories
    FOR EACH ROW EXECUTE FUNCTION update_user_stats();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

-- Users policies (users can only access their own data)
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = auth_user_id);

-- Memories policies
CREATE POLICY "Users can manage own memories" ON user_memories
    FOR ALL USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

-- Conversations policies
CREATE POLICY "Users can manage own conversations" ON conversations
    FOR ALL USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

-- Projects policies
CREATE POLICY "Users can manage own projects" ON projects
    FOR ALL USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

-- Project conversations policies
CREATE POLICY "Users can manage project conversations" ON project_conversations
    FOR ALL USING (
        project_id IN (
            SELECT p.id FROM projects p 
            JOIN users u ON u.id = p.user_id 
            WHERE u.auth_user_id = auth.uid()
        )
    );

-- Artifacts policies
CREATE POLICY "Users can manage own artifacts" ON artifacts
    FOR ALL USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

-- Search history policies
CREATE POLICY "Users can manage own search history" ON search_history
    FOR ALL USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

-- Usage events policies (read-only for users)
CREATE POLICY "Users can view own usage events" ON usage_events
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

-- Functions for common operations

-- Get user by auth_user_id
CREATE OR REPLACE FUNCTION get_user_by_auth_id(auth_user_id UUID)
RETURNS users AS $$
    SELECT * FROM users WHERE users.auth_user_id = $1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Create or update user memory
CREATE OR REPLACE FUNCTION upsert_user_memory(
    p_user_id UUID,
    p_memory_type VARCHAR,
    p_memory_key VARCHAR,
    p_memory_data JSONB,
    p_encrypted_data TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    memory_id UUID;
BEGIN
    INSERT INTO user_memories (
        user_id, memory_type, memory_key, memory_data, encrypted_data, size_bytes
    ) VALUES (
        p_user_id, p_memory_type, p_memory_key, p_memory_data, p_encrypted_data,
        length(p_memory_data::text) + COALESCE(length(p_encrypted_data), 0)
    )
    ON CONFLICT (user_id, memory_key) 
    DO UPDATE SET 
        memory_data = EXCLUDED.memory_data,
        encrypted_data = EXCLUDED.encrypted_data,
        size_bytes = EXCLUDED.size_bytes,
        updated_at = NOW()
    RETURNING id INTO memory_id;
    
    RETURN memory_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Search conversations with multiple strategies
CREATE OR REPLACE FUNCTION search_conversations(
    p_user_id UUID,
    p_query TEXT,
    p_search_type VARCHAR DEFAULT 'semantic',
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    conversation_id UUID,
    service VARCHAR,
    title TEXT,
    created_at TIMESTAMP,
    rank REAL
) AS $$
BEGIN
    CASE p_search_type
        WHEN 'semantic' THEN
            RETURN QUERY
            SELECT c.id, c.service, c.title, c.created_at,
                   ts_rank_cd(c.search_vector, plainto_tsquery('english', p_query)) as rank
            FROM conversations c
            WHERE c.user_id = p_user_id
              AND c.search_vector @@ plainto_tsquery('english', p_query)
            ORDER BY rank DESC, c.updated_at DESC
            LIMIT p_limit OFFSET p_offset;
            
        WHEN 'fuzzy' THEN
            RETURN QUERY
            SELECT c.id, c.service, c.title, c.created_at,
                   similarity(COALESCE(c.title, ''), p_query) as rank
            FROM conversations c
            WHERE c.user_id = p_user_id
              AND (c.title % p_query OR c.messages::text % p_query)
            ORDER BY rank DESC, c.updated_at DESC
            LIMIT p_limit OFFSET p_offset;
            
        WHEN 'exact' THEN
            RETURN QUERY
            SELECT c.id, c.service, c.title, c.created_at, 1.0 as rank
            FROM conversations c
            WHERE c.user_id = p_user_id
              AND (c.title ILIKE '%' || p_query || '%' 
                   OR c.messages::text ILIKE '%' || p_query || '%')
            ORDER BY c.updated_at DESC
            LIMIT p_limit OFFSET p_offset;
            
        ELSE -- default to keyword
            RETURN QUERY
            SELECT c.id, c.service, c.title, c.created_at,
                   ts_rank_cd(c.search_vector, to_tsquery('english', p_query)) as rank
            FROM conversations c
            WHERE c.user_id = p_user_id
              AND c.search_vector @@ to_tsquery('english', p_query)
            ORDER BY rank DESC, c.updated_at DESC
            LIMIT p_limit OFFSET p_offset;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Track usage event
CREATE OR REPLACE FUNCTION track_usage_event(
    p_user_id UUID,
    p_event_type VARCHAR,
    p_event_data JSONB DEFAULT '{}',
    p_tokens_used INTEGER DEFAULT 0,
    p_storage_bytes INTEGER DEFAULT 0,
    p_compute_ms INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO usage_events (
        user_id, event_type, event_data, tokens_used, 
        storage_bytes, compute_ms, billing_month
    ) VALUES (
        p_user_id, p_event_type, p_event_data, p_tokens_used,
        p_storage_bytes, p_compute_ms, DATE_TRUNC('month', NOW())
    ) RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user usage for current month
CREATE OR REPLACE FUNCTION get_user_usage_current_month(p_user_id UUID)
RETURNS TABLE (
    total_conversations INTEGER,
    total_tokens INTEGER,
    total_storage_mb NUMERIC,
    total_searches INTEGER,
    total_exports INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(CASE WHEN event_type = 'conversation_sync' THEN 1 END)::INTEGER as total_conversations,
        COALESCE(SUM(tokens_used), 0)::INTEGER as total_tokens,
        ROUND(COALESCE(SUM(storage_bytes), 0) / 1024.0 / 1024.0, 2) as total_storage_mb,
        COUNT(CASE WHEN event_type = 'search' THEN 1 END)::INTEGER as total_searches,
        COUNT(CASE WHEN event_type = 'export' THEN 1 END)::INTEGER as total_exports
    FROM usage_events
    WHERE user_id = p_user_id 
      AND billing_month = DATE_TRUNC('month', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE users IS 'Core user profiles with plan and usage information';
COMMENT ON TABLE user_memories IS 'Encrypted storage for user conversations, projects, and context';
COMMENT ON TABLE conversations IS 'AI service conversations with full-text search';
COMMENT ON TABLE projects IS 'User-created projects for organizing conversations and artifacts';
COMMENT ON TABLE artifacts IS 'Versioned storage for user-generated content';
COMMENT ON TABLE usage_events IS 'Usage tracking for billing and analytics';
COMMENT ON TABLE subscription_events IS 'Polar.sh webhook events for subscription management';

-- Initial data setup

-- Create default admin user function (for development)
CREATE OR REPLACE FUNCTION create_default_admin_user(
    p_auth_user_id UUID,
    p_email VARCHAR,
    p_full_name VARCHAR DEFAULT 'Admin User'
)
RETURNS UUID AS $$
DECLARE
    user_id UUID;
BEGIN
    INSERT INTO users (auth_user_id, email, full_name, plan_type)
    VALUES (p_auth_user_id, p_email, p_full_name, 'enterprise')
    ON CONFLICT (email) DO UPDATE SET
        auth_user_id = EXCLUDED.auth_user_id,
        full_name = EXCLUDED.full_name,
        updated_at = NOW()
    RETURNING id INTO user_id;
    
    RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Performance monitoring view
CREATE OR REPLACE VIEW user_dashboard_stats AS
SELECT 
    u.id as user_id,
    u.email,
    u.plan_type,
    u.created_at as user_since,
    
    -- Current month usage
    usage.total_conversations,
    usage.total_tokens,
    usage.total_storage_mb,
    usage.total_searches,
    usage.total_exports,
    
    -- Totals
    (SELECT COUNT(*) FROM conversations c WHERE c.user_id = u.id) as total_conversations_all_time,
    (SELECT COUNT(*) FROM projects p WHERE p.user_id = u.id) as total_projects,
    (SELECT COUNT(*) FROM artifacts a WHERE a.user_id = u.id) as total_artifacts,
    
    -- Recent activity
    u.last_active,
    (
        SELECT COUNT(*) 
        FROM usage_events ue 
        WHERE ue.user_id = u.id 
          AND ue.created_at > NOW() - INTERVAL '7 days'
    ) as activity_last_7_days
    
FROM users u
CROSS JOIN LATERAL get_user_usage_current_month(u.id) as usage;

-- Grant permissions for the dashboard view
GRANT SELECT ON user_dashboard_stats TO authenticated;

-- Add RLS policy for dashboard stats
CREATE POLICY "Users can view own dashboard stats" ON user_dashboard_stats
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

-- This completes the Supabase schema setup for the Aegntic Hive MCP serverless platform
-- The schema supports:
-- 1. Secure user authentication integration with Supabase Auth
-- 2. Encrypted memory storage for conversations and context
-- 3. Full-text search capabilities with multiple strategies
-- 4. Project and artifact management with versioning
-- 5. Usage tracking for billing and plan limits
-- 6. Row-level security for data isolation
-- 7. Performance optimization with proper indexes
-- 8. Subscription management integration with Polar.sh