-- User Management Service Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE organization_type AS ENUM ('school', 'university', 'corporate', 'nonprofit', 'government', 'individual');
CREATE TYPE membership_status AS ENUM ('active', 'inactive', 'pending', 'suspended');
CREATE TYPE permission_scope AS ENUM ('global', 'organization', 'user');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User profiles table
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    display_name VARCHAR(100),
    avatar TEXT,
    bio TEXT,
    date_of_birth DATE,
    phone_number VARCHAR(20),
    street VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(5) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User preferences table
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    type organization_type NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}',
    parent_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    conditions JSONB,
    scope permission_scope DEFAULT 'organization',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource, action)
);

-- Roles table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    hierarchy INTEGER DEFAULT 0,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    parent_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, organization_id)
);

-- Role permissions junction table
CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- User roles junction table (for global roles)
CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

-- Organization memberships table
CREATE TABLE organization_memberships (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    roles JSONB DEFAULT '[]',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status membership_status DEFAULT 'active',
    PRIMARY KEY (user_id, organization_id)
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_login ON users(last_login_at);

CREATE INDEX idx_user_profiles_name ON user_profiles(first_name, last_name);
CREATE INDEX idx_user_profiles_display_name ON user_profiles(display_name);

CREATE INDEX idx_organizations_name ON organizations(name);
CREATE INDEX idx_organizations_type ON organizations(type);
CREATE INDEX idx_organizations_parent ON organizations(parent_organization_id);
CREATE INDEX idx_organizations_active ON organizations(is_active);

CREATE INDEX idx_permissions_resource_action ON permissions(resource, action);
CREATE INDEX idx_permissions_scope ON permissions(scope);

CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_hierarchy ON roles(hierarchy);
CREATE INDEX idx_roles_organization ON roles(organization_id);
CREATE INDEX idx_roles_parent ON roles(parent_role_id);
CREATE INDEX idx_roles_system ON roles(is_system_role);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

CREATE INDEX idx_org_memberships_user ON organization_memberships(user_id);
CREATE INDEX idx_org_memberships_org ON organization_memberships(organization_id);
CREATE INDEX idx_org_memberships_status ON organization_memberships(status);

-- Create GIN indexes for JSONB columns
CREATE INDEX idx_user_preferences_gin ON user_preferences USING GIN (preferences);
CREATE INDEX idx_organizations_settings_gin ON organizations USING GIN (settings);
CREATE INDEX idx_permissions_conditions_gin ON permissions USING GIN (conditions);
CREATE INDEX idx_org_memberships_roles_gin ON organization_memberships USING GIN (roles);

-- Insert default permissions
INSERT INTO permissions (id, name, display_name, description, resource, action, scope) VALUES
-- User management permissions
(uuid_generate_v4(), 'user_create', 'Create Users', 'Create new user accounts', 'user', 'create', 'organization'),
(uuid_generate_v4(), 'user_read', 'Read Users', 'View user information', 'user', 'read', 'organization'),
(uuid_generate_v4(), 'user_update', 'Update Users', 'Modify user information', 'user', 'update', 'organization'),
(uuid_generate_v4(), 'user_delete', 'Delete Users', 'Delete user accounts', 'user', 'delete', 'organization'),

-- Role management permissions
(uuid_generate_v4(), 'role_create', 'Create Roles', 'Create new roles', 'role', 'create', 'organization'),
(uuid_generate_v4(), 'role_read', 'Read Roles', 'View role information', 'role', 'read', 'organization'),
(uuid_generate_v4(), 'role_update', 'Update Roles', 'Modify role information', 'role', 'update', 'organization'),
(uuid_generate_v4(), 'role_delete', 'Delete Roles', 'Delete roles', 'role', 'delete', 'organization'),
(uuid_generate_v4(), 'role_assign', 'Assign Roles', 'Assign roles to users', 'role', 'assign', 'organization'),

-- Organization management permissions
(uuid_generate_v4(), 'organization_create', 'Create Organizations', 'Create new organizations', 'organization', 'create', 'global'),
(uuid_generate_v4(), 'organization_read', 'Read Organizations', 'View organization information', 'organization', 'read', 'organization'),
(uuid_generate_v4(), 'organization_update', 'Update Organizations', 'Modify organization information', 'organization', 'update', 'organization'),
(uuid_generate_v4(), 'organization_delete', 'Delete Organizations', 'Delete organizations', 'organization', 'delete', 'global'),
(uuid_generate_v4(), 'organization_manage_members', 'Manage Members', 'Add/remove organization members', 'organization', 'manage_members', 'organization'),

-- Content management permissions
(uuid_generate_v4(), 'content_create', 'Create Content', 'Create educational content', 'content', 'create', 'organization'),
(uuid_generate_v4(), 'content_read', 'Read Content', 'View educational content', 'content', 'read', 'organization'),
(uuid_generate_v4(), 'content_update', 'Update Content', 'Modify educational content', 'content', 'update', 'organization'),
(uuid_generate_v4(), 'content_delete', 'Delete Content', 'Delete educational content', 'content', 'delete', 'organization'),
(uuid_generate_v4(), 'content_publish', 'Publish Content', 'Publish educational content', 'content', 'publish', 'organization'),

-- Assessment permissions
(uuid_generate_v4(), 'assessment_create', 'Create Assessments', 'Create assessments and quizzes', 'assessment', 'create', 'organization'),
(uuid_generate_v4(), 'assessment_read', 'Read Assessments', 'View assessments and results', 'assessment', 'read', 'organization'),
(uuid_generate_v4(), 'assessment_update', 'Update Assessments', 'Modify assessments', 'assessment', 'update', 'organization'),
(uuid_generate_v4(), 'assessment_delete', 'Delete Assessments', 'Delete assessments', 'assessment', 'delete', 'organization'),
(uuid_generate_v4(), 'assessment_grade', 'Grade Assessments', 'Grade student submissions', 'assessment', 'grade', 'organization'),

-- Analytics permissions
(uuid_generate_v4(), 'analytics_read', 'Read Analytics', 'View learning analytics', 'analytics', 'read', 'organization'),
(uuid_generate_v4(), 'analytics_export', 'Export Analytics', 'Export analytics data', 'analytics', 'export', 'organization');

-- Insert default system roles
INSERT INTO roles (id, name, display_name, description, hierarchy, is_system_role) VALUES
(uuid_generate_v4(), 'super_admin', 'Super Administrator', 'Full system access', 100, true),
(uuid_generate_v4(), 'system_admin', 'System Administrator', 'System-wide administrative access', 90, true),
(uuid_generate_v4(), 'admin', 'Administrator', 'Administrative access within organization', 80, true),
(uuid_generate_v4(), 'organization_manager', 'Organization Manager', 'Manage organization settings and members', 70, true),
(uuid_generate_v4(), 'user_manager', 'User Manager', 'Manage users within organization', 60, true),
(uuid_generate_v4(), 'role_manager', 'Role Manager', 'Manage roles within organization', 60, true),
(uuid_generate_v4(), 'content_manager', 'Content Manager', 'Manage educational content', 50, true),
(uuid_generate_v4(), 'teacher', 'Teacher', 'Create and manage courses and assessments', 40, true),
(uuid_generate_v4(), 'teaching_assistant', 'Teaching Assistant', 'Assist with course management', 30, true),
(uuid_generate_v4(), 'student', 'Student', 'Access learning content and take assessments', 10, true),
(uuid_generate_v4(), 'parent', 'Parent/Guardian', 'View child progress and communicate with teachers', 5, true),
(uuid_generate_v4(), 'mentor', 'Mentor', 'Provide guidance and support to students', 20, true);

-- Assign permissions to system roles
-- Super Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'super_admin';

-- System Admin gets most permissions except super admin specific ones
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'system_admin'
AND p.name NOT IN ('organization_create', 'organization_delete');

-- Admin gets organization-level permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
AND p.scope IN ('organization', 'user');

-- Organization Manager gets organization management permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'organization_manager'
AND p.name IN ('organization_read', 'organization_update', 'organization_manage_members', 'user_read', 'role_read');

-- User Manager gets user management permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'user_manager'
AND p.resource = 'user';

-- Role Manager gets role management permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'role_manager'
AND p.resource = 'role';

-- Content Manager gets content management permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'content_manager'
AND p.resource IN ('content', 'assessment');

-- Teacher gets teaching-related permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'teacher'
AND p.name IN ('content_create', 'content_read', 'content_update', 'content_publish',
               'assessment_create', 'assessment_read', 'assessment_update', 'assessment_grade',
               'analytics_read', 'user_read');

-- Teaching Assistant gets limited teaching permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'teaching_assistant'
AND p.name IN ('content_read', 'assessment_read', 'assessment_grade', 'user_read');

-- Student gets basic learning permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'student'
AND p.name IN ('content_read', 'assessment_read');

-- Parent gets limited view permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'parent'
AND p.name IN ('analytics_read', 'user_read');

-- Mentor gets mentoring permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'mentor'
AND p.name IN ('content_read', 'assessment_read', 'analytics_read', 'user_read');

-- Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();