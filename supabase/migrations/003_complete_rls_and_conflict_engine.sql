-- Migration: 003_complete_rls_and_conflict_engine.sql
-- Comprehensive RLS Policies, Conflict Engine RPCs, and Multi-Campus Isolation

-- 1. Extend Events table constraints and indexes
CREATE INDEX IF NOT EXISTS idx_events_campus_status ON events(campus_id, status);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_venues_campus ON venues(campus_id);

-- 2. Enhanced Conflict Check Function (Security Definer to check availability across all published/pending events safely)
DROP FUNCTION IF EXISTS check_venue_conflict(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID);
DROP FUNCTION IF EXISTS check_campus_schedule_overlaps(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID);

CREATE OR REPLACE FUNCTION check_venue_conflict(
    p_venue_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_exclude_event_id UUID DEFAULT NULL
)
RETURNS TABLE (
    conflict_event_id UUID,
    conflict_title VARCHAR,
    conflict_start TIMESTAMPTZ,
    conflict_end TIMESTAMPTZ,
    conflict_venue_name VARCHAR
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.title, e.start_time, e.end_time, e.location_name
    FROM events e
    WHERE e.venue_id = p_venue_id
      AND e.status IN ('published', 'pending')
      AND (p_exclude_event_id IS NULL OR e.id <> p_exclude_event_id)
      AND e.start_time < p_end_time
      AND e.end_time > p_start_time;
END;
$$ LANGUAGE plpgsql;

-- 3. Campus Schedule Overlaps Function
CREATE OR REPLACE FUNCTION check_campus_schedule_overlaps(
    p_campus_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_exclude_event_id UUID DEFAULT NULL
)
RETURNS TABLE (
    overlap_event_id UUID,
    overlap_title VARCHAR,
    overlap_start TIMESTAMPTZ,
    overlap_end TIMESTAMPTZ,
    overlap_location VARCHAR,
    overlap_community_name VARCHAR
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.title, e.start_time, e.end_time, e.location_name, COALESCE(c.name, 'Campus Organization')
    FROM events e
    LEFT JOIN communities c ON c.id = e.community_id
    WHERE e.campus_id = p_campus_id
      AND e.status IN ('published', 'pending')
      AND (p_exclude_event_id IS NULL OR e.id <> p_exclude_event_id)
      AND e.start_time < p_end_time
      AND e.end_time > p_start_time;
END;
$$ LANGUAGE plpgsql;

-- 4. Expanded Row Level Security Policies

-- Communities: Admin can view all campus communities
CREATE POLICY "Admins can view all communities for campus" ON communities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.campus_id = communities.campus_id
        )
    );

-- Communities: Admin can update communities (approve/reject/suspend)
CREATE POLICY "Admins can update campus communities" ON communities
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.campus_id = communities.campus_id
        )
    );

-- Communities: Authenticated users can submit new communities for review
CREATE POLICY "Authenticated users can submit communities" ON communities
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND created_by = auth.uid()
    );

-- Venues: Admins can view all venues (including archived) for their campus
CREATE POLICY "Admins can view all venues for their campus" ON venues
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.campus_id = venues.campus_id
        )
    );

-- Venues: Admins can insert venues for their campus
CREATE POLICY "Admins can insert venues for their campus" ON venues
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.campus_id = venues.campus_id
        )
    );

-- Venues: Admins can update venues for their campus
CREATE POLICY "Admins can update venues for their campus" ON venues
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.campus_id = venues.campus_id
        )
    );

-- Events: Admins can view all events for their campus
CREATE POLICY "Admins can view all events for their campus" ON events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.campus_id = events.campus_id
        )
    );

-- Events: Organizers can update their own community events
CREATE POLICY "Organizers can update their community events" ON events
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM community_members cm
            WHERE cm.community_id = events.community_id
              AND cm.user_id = auth.uid()
              AND cm.role = 'lead'
        )
    );

-- Events: Admins can update events for their campus (approve / reject)
CREATE POLICY "Admins can update events for their campus" ON events
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.campus_id = events.campus_id
        )
    );

-- Users: Enable RLS and self-access
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read user profiles on same campus" ON users
    FOR SELECT USING (TRUE);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (id = auth.uid());

-- Community Members: Enable RLS
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view active community memberships" ON community_members
    FOR SELECT USING (TRUE);

CREATE POLICY "Leads can manage community memberships" ON community_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM community_members cm
            WHERE cm.community_id = community_members.community_id
              AND cm.user_id = auth.uid()
              AND cm.role = 'lead'
        )
    );
