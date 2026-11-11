import { useAuth } from './useAuth';
import { can, canAny, permsFor } from '../lib/permissions';

// Hook wrapper around the permission matrix — components call can('orders:update').
export function usePermissions() {
  const { profile } = useAuth();
  const role = profile ? profile.role : null;
  return {
    role,
    can: (perm) => can(role, perm),
    canAny: (perms) => canAny(role, perms),
    perms: permsFor(role),
  };
}
