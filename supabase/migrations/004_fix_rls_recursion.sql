-- Migration: 004_fix_rls_recursion.sql
-- Fix infinite recursion in community_members RLS policy

DROP POLICY IF EXISTS "Leads can manage community memberships" ON community_members;
DROP POLICY IF EXISTS "Members view active community memberships" ON community_members;

-- Allow reading community memberships without recursion
CREATE POLICY "Public read community members" ON community_members
    FOR SELECT USING (TRUE);

-- Allow users to manage their own membership
CREATE POLICY "Users manage own membership" ON community_members
    FOR ALL USING (user_id = auth.uid());

-- Security definer functions for role checking to avoid RLS recursion across tables
CREATE OR REPLACE FUNCTION is_community_lead(p_community_id UUID, p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM community_members
        WHERE community_id = p_community_id
          AND user_id = p_user_id
          AND role = 'lead'
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_campus_admin(p_campus_id UUID, p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = p_user_id
          AND campus_id = p_campus_id
          AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql;
