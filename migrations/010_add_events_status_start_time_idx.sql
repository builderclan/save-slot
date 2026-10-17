-- Migration: 010_add_events_status_start_time_idx.sql
-- Adds composite index on events(status, start_time) to accelerate public noticeboard queries
-- and admin status triage filtering without file sorts.

CREATE INDEX IF NOT EXISTS idx_events_status_start_time ON events (status, start_time);
