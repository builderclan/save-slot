-- Migration: 006_community_onboarding.sql
-- Community Onboarding, Moderation, and Automatic Lead Association

-- 1. Add applicant tracking and moderation fields to communities
ALTER TABLE communities ADD COLUMN IF NOT EXISTS applicant_name VARCHAR(255);
ALTER TABLE communities ADD COLUMN IF NOT EXISTS applicant_email VARCHAR(255);
ALTER TABLE communities ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 2. Indexes for performance and moderation lookups
CREATE INDEX IF NOT EXISTS idx_communities_applicant_email ON communities(applicant_email);
CREATE INDEX IF NOT EXISTS idx_communities_status ON communities(status);
CREATE INDEX IF NOT EXISTS idx_communities_campus_status ON communities(campus_id, status);

-- 3. Update RLS Policies on communities
DROP POLICY IF EXISTS "Public can view approved communities" ON communities;
DROP POLICY IF EXISTS "Admins can view all communities for campus" ON communities;
DROP POLICY IF EXISTS "Members can view own community" ON communities;
DROP POLICY IF EXISTS "Authenticated users can submit communities" ON communities;
DROP POLICY IF EXISTS "Anyone can submit a pending community" ON communities;
DROP POLICY IF EXISTS "Community leads can update their community" ON communities;
DROP POLICY IF EXISTS "Admins can update campus communities" ON communities;

-- Public read: strictly approved communities only
CREATE POLICY "Public can view approved communities" ON communities
    FOR SELECT USING (status = 'approved');

-- Admins can view all communities (pending, approved, rejected) for their campus
CREATE POLICY "Admins can view all communities for campus" ON communities
    FOR SELECT USING (is_campus_admin(campus_id, auth.uid()));

-- Members / Applicants can view their own community even if pending or rejected
CREATE POLICY "Members and applicants can view own community" ON communities
    FOR SELECT USING (
        is_community_member(id, auth.uid())
        OR (auth.uid() IS NOT NULL AND created_by = auth.uid())
        OR (auth.uid() IS NOT NULL AND applicant_email = (SELECT email FROM users WHERE id = auth.uid()))
    );

-- Public / Authenticated submission: allows submitting a community with status = 'pending'
CREATE POLICY "Anyone can submit a pending community" ON communities
    FOR INSERT WITH CHECK (
        status = 'pending'
        AND campus_id IS NOT NULL
        AND name IS NOT NULL
        AND applicant_email IS NOT NULL
    );

-- Community leads can update their approved community details
CREATE POLICY "Community leads can update their community" ON communities
    FOR UPDATE USING (is_community_lead(id, auth.uid()))
    WITH CHECK (is_community_lead(id, auth.uid()));

-- Admins can update campus communities (approving, rejecting, updating)
CREATE POLICY "Admins can update campus communities" ON communities
    FOR UPDATE USING (is_campus_admin(campus_id, auth.uid()))
    WITH CHECK (is_campus_admin(campus_id, auth.uid()));

-- 4. Database Helper Routine: approve_community
CREATE OR REPLACE FUNCTION approve_community(
    p_community_id UUID,
    p_admin_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_community RECORD;
    v_applicant_user RECORD;
    v_membership RECORD;
BEGIN
    -- Check if target community exists
    SELECT * INTO v_community FROM communities WHERE id = p_community_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Community not found');
    END IF;

    -- Verify that caller is admin for this campus
    IF NOT is_campus_admin(v_community.campus_id, p_admin_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Campus admin privileges required');
    END IF;

    -- Update community status to approved
    UPDATE communities
    SET status = 'approved',
        reviewed_at = NOW(),
        reviewed_by = p_admin_id,
        rejection_reason = NULL
    WHERE id = p_community_id;

    -- Look up applicant user account by created_by or applicant_email
    IF v_community.created_by IS NOT NULL THEN
        SELECT * INTO v_applicant_user FROM users WHERE id = v_community.created_by;
    ELSIF v_community.applicant_email IS NOT NULL THEN
        SELECT * INTO v_applicant_user FROM users WHERE email = v_community.applicant_email;
    END IF;

    -- If applicant user exists, associate as community lead and upgrade role to organizer
    IF v_applicant_user.id IS NOT NULL THEN
        -- Insert or update community_members as lead
        INSERT INTO community_members (community_id, user_id, role, status)
        VALUES (p_community_id, v_applicant_user.id, 'lead', 'active')
        ON CONFLICT (community_id, user_id)
        DO UPDATE SET role = 'lead', status = 'active';

        -- Upgrade user role to organizer if currently student
        IF v_applicant_user.role = 'student' THEN
            UPDATE users SET role = 'organizer' WHERE id = v_applicant_user.id;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'community_id', p_community_id,
        'status', 'approved',
        'linked_user_id', v_applicant_user.id
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Database Helper Routine: reject_community
CREATE OR REPLACE FUNCTION reject_community(
    p_community_id UUID,
    p_admin_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_community RECORD;
BEGIN
    SELECT * INTO v_community FROM communities WHERE id = p_community_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Community not found');
    END IF;

    IF NOT is_campus_admin(v_community.campus_id, p_admin_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Campus admin privileges required');
    END IF;

    UPDATE communities
    SET status = 'rejected',
        rejection_reason = COALESCE(p_reason, 'Rejected by campus administration'),
        reviewed_at = NOW(),
        reviewed_by = p_admin_id
    WHERE id = p_community_id;

    RETURN jsonb_build_object(
        'success', true,
        'community_id', p_community_id,
        'status', 'rejected'
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execution to anon, authenticated, and service_role
GRANT EXECUTE ON FUNCTION approve_community(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION reject_community(UUID, UUID, TEXT) TO anon, authenticated, service_role;
