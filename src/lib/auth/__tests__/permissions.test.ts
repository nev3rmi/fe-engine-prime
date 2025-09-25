import { describe, it, expect, beforeEach } from 'vitest'
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  checkPermission,
  hasHigherOrEqualRole,
  getMinimumRoleForPermission,
  canManageRole,
  validatePermissionAssignment,
  getRolePermissions,
  getPermissionsForRoles,
  filterPermissionsByCategory,
  createPermissionMatrix,
  getPermissionDescription,
  getRoleDescription,
} from '../permissions'
import { UserRole, Permission, User } from '@/types/auth'
import { createUserWithPermissions } from '@/test/utils/auth-mocks'

describe('Permission System', () => {
  describe('hasPermission', () => {
    it('should return false for null user', async () => {
      const result = await hasPermission(null, Permission.READ_CONTENT)
      expect(result).toBe(false)
    })

    it('should return false for inactive user', async () => {
      const user = createUserWithPermissions([Permission.READ_CONTENT])
      user.isActive = false

      const result = await hasPermission(user, Permission.READ_CONTENT)
      expect(result).toBe(false)
    })

    it('should return true when user has permission', async () => {
      const user = createUserWithPermissions([Permission.READ_CONTENT])

      const result = await hasPermission(user, Permission.READ_CONTENT)
      expect(result).toBe(true)
    })

    it('should return false when user lacks permission', async () => {
      const user = createUserWithPermissions([Permission.READ_CONTENT])

      const result = await hasPermission(user, Permission.CREATE_CONTENT)
      expect(result).toBe(false)
    })

    it('should use role permissions when user permissions are not set', async () => {
      const user: User = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.ADMIN,
        isActive: true,
        emailVerified: true,
        // No permissions array set - should fall back to role permissions
      } as User

      const result = await hasPermission(user, Permission.ADMIN_API_ACCESS)
      expect(result).toBe(true)
    })
  })

  describe('hasAnyPermission', () => {
    it('should return true when user has at least one permission', async () => {
      const user = createUserWithPermissions([Permission.READ_CONTENT])

      const result = await hasAnyPermission(user, [
        Permission.READ_CONTENT,
        Permission.CREATE_CONTENT,
      ])
      expect(result).toBe(true)
    })

    it('should return false when user has no permissions from the list', async () => {
      const user = createUserWithPermissions([Permission.READ_CONTENT])

      const result = await hasAnyPermission(user, [
        Permission.CREATE_CONTENT,
        Permission.DELETE_CONTENT,
      ])
      expect(result).toBe(false)
    })

    it('should return false for null user', async () => {
      const result = await hasAnyPermission(null, [Permission.READ_CONTENT])
      expect(result).toBe(false)
    })
  })

  describe('hasAllPermissions', () => {
    it('should return true when user has all permissions', async () => {
      const user = createUserWithPermissions([
        Permission.READ_CONTENT,
        Permission.CREATE_CONTENT,
      ])

      const result = await hasAllPermissions(user, [
        Permission.READ_CONTENT,
        Permission.CREATE_CONTENT,
      ])
      expect(result).toBe(true)
    })

    it('should return false when user is missing any permission', async () => {
      const user = createUserWithPermissions([Permission.READ_CONTENT])

      const result = await hasAllPermissions(user, [
        Permission.READ_CONTENT,
        Permission.CREATE_CONTENT,
      ])
      expect(result).toBe(false)
    })
  })

  describe('checkPermission', () => {
    it('should deny access for unauthenticated user', async () => {
      const result = await checkPermission({
        user: null,
        action: Permission.READ_CONTENT,
      })

      expect(result.granted).toBe(false)
      expect(result.reason).toBe('User not authenticated')
    })

    it('should deny access for inactive user', async () => {
      const user = createUserWithPermissions([Permission.READ_CONTENT])
      user.isActive = false

      const result = await checkPermission({
        user,
        action: Permission.READ_CONTENT,
      })

      expect(result.granted).toBe(false)
      expect(result.reason).toBe('User account is inactive')
    })

    it('should deny access when user lacks permission', async () => {
      const user = createUserWithPermissions([Permission.READ_CONTENT])

      const result = await checkPermission({
        user,
        action: Permission.CREATE_CONTENT,
      })

      expect(result.granted).toBe(false)
      expect(result.reason).toBe('Insufficient permissions')
      expect(result.missingPermissions).toContain(Permission.CREATE_CONTENT)
    })

    it('should grant access when user has permission', async () => {
      const user = createUserWithPermissions([Permission.READ_CONTENT])

      const result = await checkPermission({
        user,
        action: Permission.READ_CONTENT,
      })

      expect(result.granted).toBe(true)
      expect(result.reason).toBeUndefined()
    })
  })

  describe('Role Hierarchy', () => {
    it('should determine role hierarchy correctly', () => {
      expect(hasHigherOrEqualRole(UserRole.ADMIN, UserRole.USER)).toBe(true)
      expect(hasHigherOrEqualRole(UserRole.ADMIN, UserRole.EDITOR)).toBe(true)
      expect(hasHigherOrEqualRole(UserRole.ADMIN, UserRole.ADMIN)).toBe(true)

      expect(hasHigherOrEqualRole(UserRole.EDITOR, UserRole.USER)).toBe(true)
      expect(hasHigherOrEqualRole(UserRole.EDITOR, UserRole.EDITOR)).toBe(true)
      expect(hasHigherOrEqualRole(UserRole.EDITOR, UserRole.ADMIN)).toBe(false)

      expect(hasHigherOrEqualRole(UserRole.USER, UserRole.USER)).toBe(true)
      expect(hasHigherOrEqualRole(UserRole.USER, UserRole.EDITOR)).toBe(false)
      expect(hasHigherOrEqualRole(UserRole.USER, UserRole.ADMIN)).toBe(false)
    })

    it('should find minimum role for permission', () => {
      expect(getMinimumRoleForPermission(Permission.READ_CONTENT)).toBe(UserRole.USER)
      expect(getMinimumRoleForPermission(Permission.CREATE_CONTENT)).toBe(UserRole.EDITOR)
      expect(getMinimumRoleForPermission(Permission.MANAGE_USER_ROLES)).toBe(UserRole.ADMIN)
    })

    it('should determine role management permissions', () => {
      // Admin can manage all roles
      expect(canManageRole(UserRole.ADMIN, UserRole.USER)).toBe(true)
      expect(canManageRole(UserRole.ADMIN, UserRole.EDITOR)).toBe(true)
      expect(canManageRole(UserRole.ADMIN, UserRole.ADMIN)).toBe(true)

      // Editor can only manage users
      expect(canManageRole(UserRole.EDITOR, UserRole.USER)).toBe(true)
      expect(canManageRole(UserRole.EDITOR, UserRole.EDITOR)).toBe(false)
      expect(canManageRole(UserRole.EDITOR, UserRole.ADMIN)).toBe(false)

      // User cannot manage any roles
      expect(canManageRole(UserRole.USER, UserRole.USER)).toBe(false)
      expect(canManageRole(UserRole.USER, UserRole.EDITOR)).toBe(false)
      expect(canManageRole(UserRole.USER, UserRole.ADMIN)).toBe(false)
    })
  })

  describe('getRolePermissions', () => {
    it('should return correct permissions for each role', async () => {
      const userPermissions = await getRolePermissions(UserRole.USER)
      expect(userPermissions).toContain(Permission.READ_CONTENT)
      expect(userPermissions).not.toContain(Permission.CREATE_CONTENT)

      const editorPermissions = await getRolePermissions(UserRole.EDITOR)
      expect(editorPermissions).toContain(Permission.READ_CONTENT)
      expect(editorPermissions).toContain(Permission.CREATE_CONTENT)

      const adminPermissions = await getRolePermissions(UserRole.ADMIN)
      expect(adminPermissions).toContain(Permission.MANAGE_SYSTEM_SETTINGS)
    })
  })

  describe('getPermissionsForRoles', () => {
    it('should aggregate permissions for multiple roles', async () => {
      const permissions = await getPermissionsForRoles([UserRole.USER, UserRole.EDITOR])

      expect(permissions).toContain(Permission.READ_CONTENT) // From USER
      expect(permissions).toContain(Permission.CREATE_CONTENT) // From EDITOR
      expect(permissions).not.toContain(Permission.MANAGE_SYSTEM_SETTINGS) // Admin only
    })

    it('should deduplicate permissions', async () => {
      const permissions = await getPermissionsForRoles([UserRole.USER, UserRole.USER])
      const userPermissions = await getRolePermissions(UserRole.USER)

      expect(permissions).toHaveLength(userPermissions.length)
    })
  })

  describe('Permission Categorization', () => {
    it('should filter permissions by category', () => {
      const allPermissions = [
        Permission.CREATE_USER,
        Permission.CREATE_CONTENT,
        Permission.VIEW_DASHBOARD,
        Permission.ADMIN_API_ACCESS,
      ]

      const userCategory = filterPermissionsByCategory(allPermissions, 'user')
      expect(userCategory).toContain(Permission.CREATE_USER)
      expect(userCategory).not.toContain(Permission.CREATE_CONTENT)

      const contentCategory = filterPermissionsByCategory(allPermissions, 'content')
      expect(contentCategory).toContain(Permission.CREATE_CONTENT)
      expect(contentCategory).not.toContain(Permission.CREATE_USER)
    })

    it('should create permission matrix', () => {
      const matrix = createPermissionMatrix()

      expect(matrix).toHaveProperty(UserRole.USER)
      expect(matrix).toHaveProperty(UserRole.EDITOR)
      expect(matrix).toHaveProperty(UserRole.ADMIN)

      expect(matrix[UserRole.ADMIN].user).toContain(Permission.CREATE_USER)
      expect(matrix[UserRole.USER].user).not.toContain(Permission.CREATE_USER)
    })
  })

  describe('Validation', () => {
    it('should validate permission assignment', () => {
      // Admin can assign any permission to any role
      const adminAssignment = validatePermissionAssignment(
        UserRole.ADMIN,
        UserRole.USER,
        [Permission.READ_CONTENT, Permission.CREATE_CONTENT]
      )
      expect(adminAssignment.valid).toBe(true)

      // Editor cannot assign admin permissions
      const editorAssignment = validatePermissionAssignment(
        UserRole.EDITOR,
        UserRole.USER,
        [Permission.MANAGE_SYSTEM_SETTINGS]
      )
      expect(editorAssignment.valid).toBe(false)
      expect(editorAssignment.errors[0]).toContain("Cannot assign permissions you don't have")

      // User cannot manage other roles
      const userAssignment = validatePermissionAssignment(
        UserRole.USER,
        UserRole.USER,
        [Permission.READ_CONTENT]
      )
      expect(userAssignment.valid).toBe(false)
      expect(userAssignment.errors[0]).toContain('USER role cannot manage USER role')
    })
  })

  describe('Descriptions', () => {
    it('should provide permission descriptions', () => {
      const description = getPermissionDescription(Permission.READ_CONTENT)
      expect(description).toBe('View and access content')

      const unknownDescription = getPermissionDescription('UNKNOWN_PERMISSION' as Permission)
      expect(unknownDescription).toBe('Unknown permission')
    })

    it('should provide role descriptions', () => {
      const adminDescription = getRoleDescription(UserRole.ADMIN)
      expect(adminDescription).toContain('Full system access')

      const unknownDescription = getRoleDescription('UNKNOWN_ROLE' as UserRole)
      expect(unknownDescription).toBe('Unknown role')
    })
  })
})