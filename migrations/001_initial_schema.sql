-- Campus Calendar Multi-Campus PostgreSQL Schema
-- Migration: 001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Campuses
CREATE TABLE campuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255),
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users Profile (links to auth.users in Supabase)
CREATE TABLE users (
    id UUID PRIMARY KEY, -- references auth.users(id) in Supabase
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'organizer', 'admin')),
    avatar_url TEXT,
    campus_id UUID REFERENCES campuses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Communities / Clubs / Departments / Student Bodies
CREATE TABLE communities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,
    website TEXT,
    instagram VARCHAR(100),
    status VARCHAR(50) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (campus_id, slug)
);

-- Community Memberships
CREATE TABLE community_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('lead', 'member')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (community_id, user_id)
);

-- Campus Venues
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    building VARCHAR(255) NOT NULL,
    capacity INT,
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (campus_id, building, name)
);

-- Events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('Tech', 'Career', 'Arts', 'Social', 'Sports', 'Academic', 'Workshop')),
    tags TEXT[] DEFAULT '{}',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    location_name VARCHAR(255) NOT NULL,
    is_virtual BOOLEAN DEFAULT FALSE,
    virtual_link TEXT,
    external_registration_url TEXT NOT NULL,
    cover_image_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'pending', 'published', 'cancelled', 'rejected')),
    rejection_reason TEXT,
    cancellation_reason TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_event_times CHECK (end_time > start_time)
);

-- Indexes for performance and high-speed conflict detection
CREATE INDEX idx_events_campus_time ON events(campus_id, start_time, end_time);
CREATE INDEX idx_events_venue_time ON events(venue_id, start_time, end_time) WHERE status IN ('published', 'pending') AND venue_id IS NOT NULL;
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_community ON events(community_id);
CREATE INDEX idx_communities_campus ON communities(campus_id);

-- Venue Conflict Check Function
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
    conflict_end TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT e.id, e.title, e.start_time, e.end_time
    FROM events e
    WHERE e.venue_id = p_venue_id
      AND e.status IN ('published', 'pending')
      AND (p_exclude_event_id IS NULL OR e.id <> p_exclude_event_id)
      AND e.start_time < p_end_time
      AND e.end_time > p_start_time;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS)
ALTER TABLE campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Campuses: Public read
CREATE POLICY "Public can view active campuses" ON campuses
    FOR SELECT USING (is_active = TRUE);

-- Communities: Public read approved communities
CREATE POLICY "Public can view approved communities" ON communities
    FOR SELECT USING (status = 'approved');

-- Venues: Public read active venues
CREATE POLICY "Public can view active venues" ON venues
    FOR SELECT USING (is_active = TRUE);

-- Events: Public read published events
CREATE POLICY "Public can view published events" ON events
    FOR SELECT USING (status = 'published');

-- Organizers can see all events of their community
CREATE POLICY "Organizers view their community events" ON events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM community_members cm
            WHERE cm.community_id = events.community_id
              AND cm.user_id = auth.uid()
        )
    );

-- Organizers can create events for communities they lead
CREATE POLICY "Organizers can insert events" ON events
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM community_members cm
            WHERE cm.community_id = events.community_id
              AND cm.user_id = auth.uid()
              AND cm.role = 'lead'
        )
    );
