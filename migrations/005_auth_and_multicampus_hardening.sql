-- Migration: 005_auth_and_multicampus_hardening.sql
-- Hardened multi-campus isolation, strict RLS enforcement, and helper routines

-- 1. Helper function to check if user is a member of a community
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

-- 2. Refine is_community_lead with NULL check
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

-- 3. Refine is_campus_admin with NULL check
CREATE OR REPLACE FUNCTION is_campus_admin(p_campus_id UUID, p_user_id UUID)
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
        WHERE id = p_user_id
          AND campus_id = p_campus_id
          AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql;

-- 4. Helper function to get user campus_id
CREATE OR REPLACE FUNCTION get_user_campus_id(p_user_id UUID)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_campus_id UUID;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN NULL;
    END IF;
    SELECT campus_id INTO v_campus_id FROM users WHERE id = p_user_id;
    RETURN v_campus_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Hardened Campuses Policies
DROP POLICY IF EXISTS "Public can view active campuses" ON campuses;
DROP POLICY IF EXISTS "Campus admins can update own campus" ON campuses;

CREATE POLICY "Public can view active campuses" ON campuses
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Campus admins can update own campus" ON campuses
    FOR UPDATE USING (is_campus_admin(id, auth.uid()))
    WITH CHECK (is_campus_admin(id, auth.uid()));

-- 6. Hardened Communities Policies
DROP POLICY IF EXISTS "Public can view approved communities" ON communities;
DROP POLICY IF EXISTS "Admins can view all communities for campus" ON communities;
DROP POLICY IF EXISTS "Admins can update campus communities" ON communities;
DROP POLICY IF EXISTS "Authenticated users can submit communities" ON communities;
DROP POLICY IF EXISTS "Community leads can update their community" ON communities;

CREATE POLICY "Public can view approved communities" ON communities
    FOR SELECT USING (status = 'approved');

CREATE POLICY "Admins can view all communities for campus" ON communities
    FOR SELECT USING (is_campus_admin(campus_id, auth.uid()));

CREATE POLICY "Members can view own community" ON communities
    FOR SELECT USING (is_community_member(id, auth.uid()));

CREATE POLICY "Authenticated users can submit communities" ON communities
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND created_by = auth.uid()
        AND campus_id = get_user_campus_id(auth.uid())
        AND status = 'pending'
    );

CREATE POLICY "Community leads can update their community" ON communities
    FOR UPDATE USING (is_community_lead(id, auth.uid()))
    WITH CHECK (is_community_lead(id, auth.uid()));

CREATE POLICY "Admins can update campus communities" ON communities
    FOR UPDATE USING (is_campus_admin(campus_id, auth.uid()))
    WITH CHECK (is_campus_admin(campus_id, auth.uid()));

-- 7. Hardened Venues Policies
DROP POLICY IF EXISTS "Public can view active venues" ON venues;
DROP POLICY IF EXISTS "Admins can view all venues for their campus" ON venues;
DROP POLICY IF EXISTS "Admins can insert venues for their campus" ON venues;
DROP POLICY IF EXISTS "Admins can update venues for their campus" ON venues;

CREATE POLICY "Public can view active venues" ON venues
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can view all venues for their campus" ON venues
    FOR SELECT USING (is_campus_admin(campus_id, auth.uid()));

CREATE POLICY "Admins can insert venues for their campus" ON venues
    FOR INSERT WITH CHECK (is_campus_admin(campus_id, auth.uid()));

CREATE POLICY "Admins can update venues for their campus" ON venues
    FOR UPDATE USING (is_campus_admin(campus_id, auth.uid()))
    WITH CHECK (is_campus_admin(campus_id, auth.uid()));

-- 8. Hardened Events Policies
DROP POLICY IF EXISTS "Public can view published events" ON events;
DROP POLICY IF EXISTS "Organizers view their community events" ON events;
DROP POLICY IF EXISTS "Organizers can insert events" ON events;
DROP POLICY IF EXISTS "Organizers can update their community events" ON events;
DROP POLICY IF EXISTS "Admins can view all events for their campus" ON events;
DROP POLICY IF EXISTS "Admins can update events for their campus" ON events;

-- Public read: strictly published events only
CREATE POLICY "Public can view published events" ON events
    FOR SELECT USING (status = 'published');

-- Organizers view all events for their community (draft, pending, published, etc.)
CREATE POLICY "Organizers view their community events" ON events
    FOR SELECT USING (is_community_member(community_id, auth.uid()));

-- Admins view all events for their campus
CREATE POLICY "Admins can view all events for their campus" ON events
    FOR SELECT USING (is_campus_admin(campus_id, auth.uid()));

-- Organizers insert events for their community: must be active lead, must match community campus
CREATE POLICY "Organizers can insert events" ON events
    FOR INSERT WITH CHECK (
        is_community_lead(community_id, auth.uid())
        AND campus_id = (SELECT campus_id FROM communities WHERE id = community_id)
        AND created_by = auth.uid()
    );

-- Admins insert events for their campus
CREATE POLICY "Admins can insert events" ON events
    FOR INSERT WITH CHECK (
        is_campus_admin(campus_id, auth.uid())
        AND created_by = auth.uid()
    );

-- Organizers update events for their community
CREATE POLICY "Organizers can update their community events" ON events
    FOR UPDATE USING (is_community_lead(community_id, auth.uid()))
    WITH CHECK (
        is_community_lead(community_id, auth.uid())
        AND campus_id = (SELECT campus_id FROM communities WHERE id = community_id)
    );

-- Admins update events for their campus
CREATE POLICY "Admins can update events for their campus" ON events
    FOR UPDATE USING (is_campus_admin(campus_id, auth.uid()))
    WITH CHECK (is_campus_admin(campus_id, auth.uid()));

-- 9. Hardened Community Members Policies
DROP POLICY IF EXISTS "Public read community members" ON community_members;
DROP POLICY IF EXISTS "Users manage own membership" ON community_members;
DROP POLICY IF EXISTS "Community leads can manage members" ON community_members;
DROP POLICY IF EXISTS "Campus admins can manage community members" ON community_members;

CREATE POLICY "Public read community members" ON community_members
    FOR SELECT USING (TRUE);

CREATE POLICY "Users manage own membership" ON community_members
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Community leads can manage members" ON community_members
    FOR ALL USING (is_community_lead(community_id, auth.uid()));

CREATE POLICY "Campus admins can manage community members" ON community_members
    FOR ALL USING (is_campus_admin((SELECT campus_id FROM communities WHERE id = community_members.community_id), auth.uid()));

-- 10. RPC function permissions
GRANT EXECUTE ON FUNCTION check_venue_conflict(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_campus_schedule_overlaps(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO anon, authenticated, service_role;
