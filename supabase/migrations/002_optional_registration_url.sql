-- Migration: 002_optional_registration_url.sql
-- Allow external_registration_url to be nullable for open events that do not require external registration

ALTER TABLE events ALTER COLUMN external_registration_url DROP NOT NULL;
