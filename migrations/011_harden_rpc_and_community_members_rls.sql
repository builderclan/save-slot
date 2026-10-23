-- Migration: 011_harden_rpc_and_community_members_rls.sql
-- SEC-01: Harden approve_community & reject_community RPC identity checks (enforce auth.uid() admin verification)
-- SEC-02: Harden community_members RLS policy to prevent client-side self-elevation to lead

-- 1. Replace approve_community to enforce that caller's auth.uid() is the actual campus administrator
CREATE OR REPLACE FUNCTION approve_community(
    p_community_id UUID,
    p_admin_id UUID DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_community RECORD;
    v_applicant_user RECORD;
    v_effective_admin_id UUID;
BEGIN
    -- Determine effective admin identity from JWT auth context
    v_effective_admin_id := auth.uid();
    
    -- Check if target community exists
    SELECT * INTO v_community FROM communities WHERE id = p_community_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Community not found');
    END IF;

    -- Verify that the authenticated caller has campus admin privileges for this community
    IF v_effective_admin_id IS NULL OR NOT is_campus_admin(v_community.campus_id, v_effective_admin_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Authenticated campus admin privileges required');
    END IF;

    -- Update community status to approved
    UPDATE communities
    SET status = 'approved',
        reviewed_at = NOW(),
        reviewed_by = v_effective_admin_id,
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

-- 2. Replace reject_community to enforce that caller's auth.uid() is the actual campus administrator
CREATE OR REPLACE FUNCTION reject_community(
    p_community_id UUID,
    p_admin_id UUID DEFAULT NULL,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_community RECORD;
    v_effective_admin_id UUID;
BEGIN
    v_effective_admin_id := auth.uid();

    SELECT * INTO v_community FROM communities WHERE id = p_community_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Community not found');
    END IF;

    IF v_effective_admin_id IS NULL OR NOT is_campus_admin(v_community.campus_id, v_effective_admin_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Authenticated campus admin privileges required');
    END IF;

    UPDATE communities
    SET status = 'rejected',
        rejection_reason = COALESCE(p_reason, 'Rejected by campus administration'),
        reviewed_at = NOW(),
        reviewed_by = v_effective_admin_id
    WHERE id = p_community_id;

    RETURN jsonb_build_object(
        'success', true,
        'community_id', p_community_id,
        'status', 'rejected'
    );
END;
$$ LANGUAGE plpgsql;

-- 3. Revoke public/anon execution on administrative moderation functions
REVOKE EXECUTE ON FUNCTION approve_community(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION reject_community(UUID, UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION approve_community(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION reject_community(UUID, UUID, TEXT) TO authenticated, service_role;

-- 4. Harden community_members RLS: Prevent client-side role elevation
DROP POLICY IF EXISTS "Users manage own membership" ON community_members;

-- Authenticated students may only self-join as a regular member
CREATE POLICY "Users join as member" ON community_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND role = 'member'
        AND status = 'active'
    );

-- Authenticated users may leave communities they belong to
CREATE POLICY "Users leave community" ON community_members
    FOR DELETE USING (user_id = auth.uid());
