-- Educational Platform Authentication Service Database Schema
-- This is a basic schema for development. In production, use proper migrations.

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS educational_platform;

-- Connect to the database
\c educational_platform;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    hierarchy INTEGER DEFAULT 0,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, organization_id)
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    conditions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Role permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar VARCHAR(500),
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    preferences JSONB DEFAULT '{}',
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    backup_codes TEXT[],
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User organization memberships
CREATE TABLE IF NOT EXISTS user_organizations (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, organization_id)
);

-- User roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id),
    PRIMARY KEY (user_id, role_id, organization_id)
);

-- OAuth providers table
CREATE TABLE IF NOT EXISTS oauth_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    provider_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_id)
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_org_id ON user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_oauth_providers_user_id ON oauth_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_providers_provider ON oauth_providers(provider, provider_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Insert default data
INSERT INTO organizations (id, name, domain) VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'localhost')
ON CONFLICT DO NOTHING;

INSERT INTO roles (id, name, description, hierarchy, organization_id) VALUES 
    ('00000000-0000-0000-0000-000000000001', 'super_admin', 'Super Administrator', 100, NULL),
    ('00000000-0000-0000-0000-000000000002', 'admin', 'Administrator', 90, '00000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000003', 'teacher', 'Teacher', 50, '00000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000004', 'student', 'Student', 10, '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

INSERT INTO permissions (id, name, resource, action) VALUES 
    ('00000000-0000-0000-0000-000000000001', 'manage_users', 'users', 'manage'),
    ('00000000-0000-0000-0000-000000000002', 'view_users', 'users', 'view'),
    ('00000000-0000-0000-0000-000000000003', 'manage_content', 'content', 'manage'),
    ('00000000-0000-0000-0000-000000000004', 'view_content', 'content', 'view'),
    ('00000000-0000-0000-0000-000000000005', 'create_assessments', 'assessments', 'create'),
    ('00000000-0000-0000-0000-000000000006', 'take_assessments', 'assessments', 'take')
ON CONFLICT DO NOTHING;

-- Assign permissions to roles
INSERT INTO role_permissions (role_id, permission_id) VALUES 
    -- Super admin gets all permissions
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005'),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006'),
    -- Admin permissions
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002'),
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003'),
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004'),
    -- Teacher permissions
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002'),
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003'),
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004'),
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000005'),
    -- Student permissions
    ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004'),
    ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000006')
ON CONFLICT DO NOTHING;

-- Create a test user (password: password123)
INSERT INTO users (id, email, password_hash, first_name, last_name) VALUES 
    ('00000000-0000-0000-0000-000000000001', 'test@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uIoO', 'Test', 'User')
ON CONFLICT DO NOTHING;

-- Assign test user to default organization
INSERT INTO user_organizations (user_id, organization_id) VALUES 
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Assign student role to test user
INSERT INTO user_roles (user_id, role_id, organization_id) VALUES 
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;