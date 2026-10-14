-- Migration: 009_add_target_audience.sql
-- Adds target_audience text array column to events table with GIN index for audience conflict checks

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS target_audience TEXT[] NOT NULL DEFAULT '{"All Students"}';

CREATE INDEX IF NOT EXISTS idx_events_target_audience ON events USING gin (target_audience);
