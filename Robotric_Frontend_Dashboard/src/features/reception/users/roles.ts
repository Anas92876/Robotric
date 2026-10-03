import type { LucideIcon } from 'lucide-react';
import { Briefcase, Clipboard, Code2, Crown, GraduationCap, Handshake, Megaphone, PenTool, Presentation, Scale, Shield, Target, Truck, Users } from 'lucide-react';

/** Every account role, in the order the role filter and form list them. */
export const ROLES = [
  'student',
  'trainer',
  'teacher',
  'reception',
  'social',
  'engineer',
  'client',
  'driver',
  'judge',
  'editor',
  'organizer',
  'clo',
  'cto',
  'admin',
  'superadmin',
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_ICON: Record<string, LucideIcon> = {
  student: GraduationCap,
  trainer: Presentation,
  teacher: Presentation,
  reception: Clipboard,
  social: Megaphone,
  engineer: Code2,
  client: Handshake,
  driver: Truck,
  judge: Scale,
  editor: PenTool,
  organizer: Target,
  clo: Briefcase,
  cto: Briefcase,
  admin: Shield,
  superadmin: Crown,
};
export const roleIcon = (role: string): LucideIcon => ROLE_ICON[role] ?? Users;

/** Accounts only an admin may create, edit or promote to (backend: PRIVILEGED_ROLE). */
const PRIVILEGED = new Set(['admin', 'superadmin', 'clo', 'cto']);
const isAdmin = (role?: string) => role === 'admin' || role === 'superadmin';
export const isAdminViewer = isAdmin;

/** Roles the signed-in person may pick in the account form. */
export function assignableRoles(viewerRole?: string): Role[] {
  return ROLES.filter((r) => r !== 'superadmin' && r !== 'driver' && (!PRIVILEGED.has(r) || isAdmin(viewerRole)));
}

/** Roles shown in the list filter (admins also see admin accounts; the backend hides them from others). */
export function filterableRoles(viewerRole?: string): Role[] {
  return ROLES.filter((r) => isAdmin(viewerRole) || (r !== 'admin' && r !== 'superadmin'));
}

/**
 * Mirrors the backend rules: only admins touch privileged accounts, nobody
 * disables or deletes their own account, only a superadmin deletes an admin.
 */
export function permissionsFor(target: { id: string; role: string }, me: { id: string; role: string } | null) {
  const isSelf = !!me && target.id === me.id;
  const canManage = !PRIVILEGED.has(target.role) || isAdmin(me?.role);
  return {
    canEdit: canManage,
    canToggle: canManage && !isSelf,
    canDelete: canManage && !isSelf && (!isAdmin(target.role) || me?.role === 'superadmin'),
  };
}
