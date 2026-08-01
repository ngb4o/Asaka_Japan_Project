import { userModel } from '~/models/userModel'

const VALID_ROLES = Object.values(userModel.USER_ROLES)

/**
 * Normalize to unique valid roles[]. Accepts roles[], role string, or legacy docs.
 */
export const normalizeRoles = (input) => {
  let list = []
  if (Array.isArray(input)) {
    list = input
  } else if (typeof input === 'string' && input) {
    list = [input]
  }

  const unique = []
  for (const value of list) {
    if (VALID_ROLES.includes(value) && !unique.includes(value)) {
      unique.push(value)
    }
  }
  return unique
}

/** Resolve roles from a user document, JWT-like payload, roles[], or a bare role string. */
export const resolveRoles = (user) => {
  if (!user) return [userModel.USER_ROLES.ADMIN]
  if (typeof user === 'string') {
    const fromString = normalizeRoles(user)
    return fromString.length ? fromString : [userModel.USER_ROLES.ADMIN]
  }
  const fromArray = normalizeRoles(user.roles)
  if (fromArray.length) return fromArray
  if (user.role && VALID_ROLES.includes(user.role)) return [user.role]
  // Legacy users without role → admin (same as previous middleware default)
  return [userModel.USER_ROLES.ADMIN]
}

export const primaryRole = (userOrRoles) => {
  const roles =
    typeof userOrRoles === 'string' || Array.isArray(userOrRoles)
      ? normalizeRoles(userOrRoles)
      : resolveRoles(userOrRoles)
  return roles[0] || userModel.USER_ROLES.SALES
}

export const hasAnyRole = (userOrRoles, ...allowed) => {
  const roles =
    typeof userOrRoles === 'string' || Array.isArray(userOrRoles)
      ? normalizeRoles(userOrRoles)
      : resolveRoles(userOrRoles)
  if (roles.includes(userModel.USER_ROLES.ADMIN)) return true
  return allowed.some((role) => roles.includes(role))
}

export const hasRole = (userOrRoles, role) => {
  const roles =
    typeof userOrRoles === 'string' || Array.isArray(userOrRoles)
      ? normalizeRoles(userOrRoles)
      : resolveRoles(userOrRoles)
  return roles.includes(role)
}

/** Mongo filter: user holds this role (roles[] or legacy role field). */
export const roleMatchQuery = (role) => ({
  $or: [{ roles: role }, { role }]
})

export const rolesHelper = {
  VALID_ROLES,
  normalizeRoles,
  resolveRoles,
  primaryRole,
  hasAnyRole,
  hasRole,
  roleMatchQuery
}
