-- Migration: 014_rename_tic_to_fic.sql
-- Renames internal role 'tic' (Teacher-in-Charge) to 'fic' (Faculty-in-Charge)
-- across users, community_members, and audit logs.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE community_members DROP CONSTRAINT IF EXISTS community_members_role_check;

UPDATE users SET role = 'fic' WHERE role = 'tic';
UPDATE community_members SET role = 'fic' WHERE role = 'tic';
UPDATE event_approvals SET stage = 'stage2_fic' WHERE stage = 'stage2_tic';
UPDATE event_approvals SET actor_role_snapshot = 'fic' WHERE actor_role_snapshot = 'tic';

ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
    role IN ('admin', 'principal', 'vice_principal', 'hod', 'fic', 'staff', 'lead')
);
ALTER TABLE community_members ADD CONSTRAINT community_members_role_check CHECK (
    role IN ('lead', 'fic', 'member')
);
