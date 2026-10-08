-- Migration: 007_add_reviewed_by.sql
-- Adds reviewed_by tracking column to public.events and creates index for fast audit history lookups

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_reviewed_by ON events (reviewed_by);
