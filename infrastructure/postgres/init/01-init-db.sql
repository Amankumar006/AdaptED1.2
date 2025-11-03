-- Initialize Educational Platform Database
-- Note: Database creation is handled by POSTGRES_DB env variable

-- Create replication user (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'replicator') THEN
    CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'replicator_password';
  END IF;
END
$$;

-- Create application databases
\c educational_platform;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create schemas for different services
CREATE SCHEMA IF NOT EXISTS auth_service;
CREATE SCHEMA IF NOT EXISTS user_service;
CREATE SCHEMA IF NOT EXISTS assessment_service;
CREATE SCHEMA IF NOT EXISTS analytics_service;
CREATE SCHEMA IF NOT EXISTS gamification_service;

-- Create application user (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'app_user') THEN
    CREATE USER app_user WITH ENCRYPTED PASSWORD 'app_password';
  END IF;
END
$$;
GRANT CONNECT ON DATABASE educational_platform TO app_user;
GRANT USAGE ON SCHEMA auth_service TO app_user;
GRANT USAGE ON SCHEMA user_service TO app_user;
GRANT USAGE ON SCHEMA assessment_service TO app_user;
GRANT USAGE ON SCHEMA analytics_service TO app_user;
GRANT USAGE ON SCHEMA gamification_service TO app_user;

-- Grant permissions on schemas
GRANT CREATE ON SCHEMA auth_service TO app_user;
GRANT CREATE ON SCHEMA user_service TO app_user;
GRANT CREATE ON SCHEMA assessment_service TO app_user;
GRANT CREATE ON SCHEMA analytics_service TO app_user;
GRANT CREATE ON SCHEMA gamification_service TO app_user;