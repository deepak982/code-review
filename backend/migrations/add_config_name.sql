-- Migration: Add config_name column to gitlab_configs table
-- Date: 2026-02-11
-- Description: Adds a friendly name field to help users identify and categorize GitLab configurations

ALTER TABLE gitlab_configs
ADD COLUMN IF NOT EXISTS config_name VARCHAR(255);

-- Add comment to explain the column
COMMENT ON COLUMN gitlab_configs.config_name IS 'Friendly name to identify this configuration (e.g., "Personal GitLab", "Work Account")';
