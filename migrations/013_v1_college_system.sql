-- Migration: 013_v1_college_system.sql
-- SaveSlot v1.0.0 Full College Governance Schema
-- - Dedicated 1-Host, 1-DB per college (drops campuses & campus_id in favor of 1-row college_settings)
-- - Adds departments (with Acting HOD support), Internal/External communities, expanded 7-role RBAC
-- - Adds multi-stage parallel approvals, immutable audit trail, mentors, NAAC/NBA closure reports,
--   atomic reference counters, and in-app notifications.

-- ==========================================================================
-- 1. Drop legacy POC RLS policies, RPCs, and indexes tied to campuses/campus_id
-- ==========================================================================

DROP POLICY IF EXISTS "Public can view active campuses" ON campuses;
DROP POLICY IF EXISTS "Campus admins can update own campus" ON campuses;

DROP POLICY IF EXISTS "Public can view approved communities" ON communities;
DROP POLICY IF EXISTS "Admins can view all communities for campus" ON communities;
DROP POLICY IF EXISTS "Members can view own community" ON communities;
DROP POLICY IF EXISTS "Members and applicants can view own community" ON communities;
DROP POLICY IF EXISTS "Authenticated users can submit communities" ON communities;
DROP POLICY IF EXISTS "Anyone can submit a pending community" ON communities;
DROP POLICY IF EXISTS "Community leads can update their community" ON communities;
DROP POLICY IF EXISTS "Admins can update campus communities" ON communities;

DROP POLICY IF EXISTS "Public can view active venues" ON venues;
DROP POLICY IF EXISTS "Admins can view all venues for their campus" ON venues;
DROP POLICY IF EXISTS "Admins can insert venues for their campus" ON venues;
DROP POLICY IF EXISTS "Admins can update venues for their campus" ON venues;

DROP POLICY IF EXISTS "Public can view published events" ON events;
DROP POLICY IF EXISTS "Organizers view their community events" ON events;
DROP POLICY IF EXISTS "Organizers can insert events" ON events;
DROP POLICY IF EXISTS "Organizers can update their community events" ON events;
DROP POLICY IF EXISTS "Admins can view all events for their campus" ON events;
DROP POLICY IF EXISTS "Admins can insert events" ON events;
DROP POLICY IF EXISTS "Admins can update events for their campus" ON events;

DROP POLICY IF EXISTS "Public read user profiles on same campus" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

DROP POLICY IF EXISTS "Public read community members" ON community_members;
DROP POLICY IF EXISTS "Users manage own membership" ON community_members;
DROP POLICY IF EXISTS "Users join as member" ON community_members;
DROP POLICY IF EXISTS "Users leave community" ON community_members;
DROP POLICY IF EXISTS "Community leads can manage members" ON community_members;
DROP POLICY IF EXISTS "Campus admins can manage community members" ON community_members;

DROP FUNCTION IF EXISTS approve_community(UUID, UUID);
DROP FUNCTION IF EXISTS reject_community(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS check_campus_schedule_overlaps(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID);
DROP FUNCTION IF EXISTS check_venue_conflict(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID);
DROP FUNCTION IF EXISTS is_campus_admin(UUID, UUID);
DROP FUNCTION IF EXISTS get_user_campus_id(UUID);
DROP FUNCTION IF EXISTS is_community_lead(UUID, UUID);
DROP FUNCTION IF EXISTS is_community_member(UUID, UUID);

DROP INDEX IF EXISTS idx_events_campus_time;
DROP INDEX IF EXISTS idx_events_campus_status;
DROP INDEX IF EXISTS idx_events_venue_time;
DROP INDEX IF EXISTS idx_communities_campus;
DROP INDEX IF EXISTS idx_communities_campus_status;
DROP INDEX IF EXISTS idx_venues_campus;

-- ==========================================================================
-- 2. Single-row college_settings (replaces campuses)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS college_settings (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    college_name VARCHAR(255) NOT NULL DEFAULT 'Albertian Institute of Science & Technology (AISAT)',
    short_code VARCHAR(20) NOT NULL DEFAULT 'AISAT',
    letterhead_subtitle VARCHAR(255) DEFAULT 'Affiliated to APJ Abdul Kalam Technological University',
    logo_url TEXT,
    academic_year_start_month INT NOT NULL DEFAULT 7 CHECK (academic_year_start_month BETWEEN 1 AND 12),
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO college_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ==========================================================================
-- 3. Departments table (created before users.department_id FK; HOD FKs added after users)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    hod_user_id UUID,
    acting_hod_user_id UUID,
    is_acting_hod_active BOOLEAN NOT NULL DEFAULT FALSE,
    acting_hod_toggled_by UUID,
    acting_hod_toggled_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================================================
-- 4. Drop campus_id and campuses; evolve core POC tables to v1.0.0
-- ==========================================================================

ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_campus_id_building_name_key;
ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_campus_building_name_key;
ALTER TABLE venues DROP COLUMN IF EXISTS campus_id;
ALTER TABLE venues ALTER COLUMN is_active SET NOT NULL;
ALTER TABLE venues ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE venues ADD CONSTRAINT venues_building_name_key UNIQUE (building, name);

ALTER TABLE communities DROP CONSTRAINT IF EXISTS communities_campus_id_slug_key;
ALTER TABLE communities DROP COLUMN IF EXISTS campus_id;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS code VARCHAR(20);
ALTER TABLE communities ADD COLUMN IF NOT EXISTS scope VARCHAR(20) NOT NULL DEFAULT 'internal';
UPDATE communities
SET code = UPPER(LEFT(REGEXP_REPLACE(COALESCE(NULLIF(slug, ''), name), '[^a-zA-Z0-9]', '', 'g'), 10))
WHERE code IS NULL OR code = '';
ALTER TABLE communities ALTER COLUMN code SET NOT NULL;
ALTER TABLE communities DROP CONSTRAINT IF EXISTS communities_scope_check;
ALTER TABLE communities ADD CONSTRAINT communities_scope_check CHECK (scope IN ('internal', 'external'));
ALTER TABLE communities ADD CONSTRAINT communities_slug_key UNIQUE (slug);
ALTER TABLE communities ADD CONSTRAINT communities_code_key UNIQUE (code);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users DROP COLUMN IF EXISTS campus_id;
ALTER TABLE users ADD COLUMN IF NOT EXISTS designation VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
UPDATE users SET role = 'lead' WHERE role IN ('student', 'organizer');
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'lead';
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
    role IN ('admin', 'principal', 'vice_principal', 'hod', 'tic', 'staff', 'lead')
);

ALTER TABLE departments
    ADD CONSTRAINT departments_hod_user_id_fkey FOREIGN KEY (hod_user_id) REFERENCES users(id) ON DELETE SET NULL,
    ADD CONSTRAINT departments_acting_hod_user_id_fkey FOREIGN KEY (acting_hod_user_id) REFERENCES users(id) ON DELETE SET NULL,
    ADD CONSTRAINT departments_acting_hod_toggled_by_fkey FOREIGN KEY (acting_hod_toggled_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE community_members DROP CONSTRAINT IF EXISTS community_members_role_check;
ALTER TABLE community_members ALTER COLUMN role SET DEFAULT 'lead';
ALTER TABLE community_members ADD CONSTRAINT community_members_role_check CHECK (role IN ('lead', 'tic', 'member'));

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_community_id_fkey;
ALTER TABLE events DROP COLUMN IF EXISTS campus_id;
ALTER TABLE events ALTER COLUMN community_id DROP NOT NULL;
ALTER TABLE events
    ADD CONSTRAINT events_community_id_fkey FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE RESTRICT;

ALTER TABLE events ADD COLUMN IF NOT EXISTS origin_type VARCHAR(20) NOT NULL DEFAULT 'community';
ALTER TABLE events ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE RESTRICT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS coordinator_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100);
ALTER TABLE events ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20);
ALTER TABLE events ADD COLUMN IF NOT EXISTS estimated_budget NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS funding_source VARCHAR(100) NOT NULL DEFAULT 'No Cost';
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_lead_time_overridden BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS override_reason TEXT;
ALTER TABLE events ALTER COLUMN timezone SET DEFAULT 'Asia/Kolkata';
ALTER TABLE events ALTER COLUMN status SET DEFAULT 'draft';

UPDATE events SET status = 'pending_executive' WHERE status = 'pending';

ALTER TABLE events ADD CONSTRAINT events_reference_number_key UNIQUE (reference_number);
ALTER TABLE events ADD CONSTRAINT events_origin_type_check CHECK (origin_type IN ('community', 'department', 'college'));
ALTER TABLE events ADD CONSTRAINT events_status_check CHECK (
    status IN (
        'draft',
        'pending_stage2',
        'pending_executive',
        'published',
        'needs_reschedule',
        'rejected',
        'cancelled',
        'pending_report_verification',
        'completed'
    )
);
ALTER TABLE events ADD CONSTRAINT events_origin_owner_check CHECK (
    (origin_type = 'community' AND community_id IS NOT NULL) OR
    (origin_type = 'department' AND department_id IS NOT NULL) OR
    (origin_type = 'college')
);

CREATE INDEX IF NOT EXISTS idx_events_status_start ON events (status, start_time);
CREATE INDEX IF NOT EXISTS idx_events_origin_dept ON events (origin_type, department_id, community_id);
CREATE INDEX IF NOT EXISTS idx_events_venue_time ON events (venue_id, start_time, end_time)
    WHERE status IN ('pending_stage2', 'pending_executive', 'published') AND venue_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_ref_num ON events (reference_number);

DROP TABLE IF EXISTS campuses CASCADE;

-- ==========================================================================
-- 5. New v1.0.0 workflow, audit, mentor, report, ref-counter & notification tables
-- ==========================================================================

CREATE TABLE IF NOT EXISTS event_stage2_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('department', 'community')),
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    approval_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    approval_remarks TEXT,
    report_verify_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (report_verify_status IN ('pending', 'verified', 'revision_requested')),
    report_verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    report_verified_at TIMESTAMPTZ,
    report_remarks TEXT,
    CONSTRAINT stage2_entity_target_check CHECK (
        (entity_type = 'department' AND department_id IS NOT NULL AND community_id IS NULL) OR
        (entity_type = 'community' AND community_id IS NOT NULL AND department_id IS NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stage2_unique_dept
    ON event_stage2_approvals (event_id, department_id) WHERE department_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_stage2_unique_comm
    ON event_stage2_approvals (event_id, community_id) WHERE community_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS event_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    stage VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_name_snapshot VARCHAR(255) NOT NULL,
    actor_role_snapshot VARCHAR(100) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_approvals_event_created ON event_approvals (event_id, created_at);

CREATE TABLE IF NOT EXISTS event_mentors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role_title VARCHAR(255) NOT NULL,
    organization VARCHAR(255) NOT NULL,
    mentor_type VARCHAR(20) NOT NULL CHECK (mentor_type IN ('internal', 'external')),
    phase VARCHAR(20) NOT NULL DEFAULT 'planned' CHECK (phase IN ('planned', 'confirmed'))
);

CREATE INDEX IF NOT EXISTS idx_event_mentors_event ON event_mentors (event_id);

CREATE TABLE IF NOT EXISTS event_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
    actual_fund_used NUMERIC(12, 2) NOT NULL DEFAULT 0,
    funding_source VARCHAR(100) NOT NULL DEFAULT 'No Cost',
    fund_notes TEXT,
    student_count INT NOT NULL DEFAULT 0,
    faculty_count INT NOT NULL DEFAULT 0,
    external_count INT NOT NULL DEFAULT 0,
    summary TEXT NOT NULL,
    outcomes TEXT NOT NULL,
    evidence_url TEXT,
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_reference_counters (
    academic_year VARCHAR(20) NOT NULL,
    host_code VARCHAR(20) NOT NULL,
    last_seq INT NOT NULL DEFAULT 0,
    PRIMARY KEY (academic_year, host_code)
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_id, is_read, created_at DESC);

-- ==========================================================================
-- 6. Updated conflict RPC & clean single-college RLS policies
-- ==========================================================================

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
      AND e.status IN ('pending_stage2', 'pending_executive', 'published', 'pending_report_verification', 'completed')
      AND (p_exclude_event_id IS NULL OR e.id <> p_exclude_event_id)
      AND e.start_time < p_end_time
      AND e.end_time > p_start_time;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION check_venue_conflict(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = p_user_id AND role = 'admin' AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_executive(p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = p_user_id AND role IN ('principal', 'vice_principal') AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_community_lead(p_community_id UUID, p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM community_members
        WHERE community_id = p_community_id
          AND user_id = p_user_id
          AND role = 'lead'
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_community_member(p_community_id UUID, p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM community_members
        WHERE community_id = p_community_id
          AND user_id = p_user_id
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql;

ALTER TABLE college_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_stage2_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reference_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view college settings" ON college_settings FOR SELECT USING (TRUE);
CREATE POLICY "Admin can update college settings" ON college_settings FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Public can view active departments" ON departments FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admin can manage departments" ON departments FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Public can view approved communities" ON communities FOR SELECT USING (status = 'approved');
CREATE POLICY "Admin and executives can manage communities" ON communities
    FOR ALL USING (is_admin(auth.uid()) OR is_executive(auth.uid()));

CREATE POLICY "Public read community members" ON community_members FOR SELECT USING (TRUE);
CREATE POLICY "Admin manages community members" ON community_members FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Public can view active venues" ON venues FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admin can manage venues" ON venues FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Public read active user names" ON users FOR SELECT USING (TRUE);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Admin manages users" ON users FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Public can view published and completed events" ON events
    FOR SELECT USING (status IN ('published', 'pending_report_verification', 'completed'));
CREATE POLICY "Executives can manage events" ON events FOR ALL USING (is_executive(auth.uid()));
CREATE POLICY "Creators can view own events" ON events FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users read own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());
