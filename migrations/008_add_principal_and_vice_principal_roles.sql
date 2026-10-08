-- Migration: 008_add_principal_and_vice_principal_roles.sql
-- Expands users role check constraint to include 'principal' and 'vice_principal' administrative roles

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('student', 'organizer', 'admin', 'principal', 'vice_principal'));
