import { UserPrincipal, Permission, UserRole } from './types';

/**
 * Resource types in the system
 */
export enum Resource {
  USER = 'user',
  PRODUCT = 'product',
  CATEGORY = 'category',
  SUPPLIER = 'supplier',
  INVENTORY = 'inventory',
  ORDER = 'order',
  REPORT = 'report',
  FILE = 'file',
  ADMIN = 'admin',
  ACTUATOR = 'actuator',
}

/**
 * Action types that can be performed on resources
 */
export enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  MANAGE = 'manage',
  EXECUTE = 'execute',
}

/**
 * Permission Service for role-based access control
 * Manages permissions and authorization logic
 */
export class PermissionService {
  private rolePermissions: Map<string, Permission[]>;

  constructor() {
    this.rolePermissions = new Map();
    this.initializeDefaultPermissions();
  }

  /**
   * Check if user has permission to perform action on resource
   */
  hasPermission(
    user: UserPrincipal,
    resource: Resource | string,
    action: Action | string,
    conditions?: Record<string, any>
  ): boolean {
    const userPermissions = this.getUserPermissions(user.role);
    
    return userPermissions.some(permission => {
      const resourceMatch = permission.resource === resource || permission.resource === '*';
      const actionMatch = permission.action === action || permission.action === '*';
      const conditionsMatch = this.checkConditions(permission.conditions, conditions, user);
      
      return resourceMatch && actionMatch && conditionsMatch;
    });
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(user: UserPrincipal, roles: string[]): boolean {
    return roles.includes(user.role);
  }

  /**
   * Check if user has specific role
   */
  hasRole(user: UserPrincipal, role: string): boolean {
    return user.role === role;
  }

  /**
   * Check if user is admin
   */
  isAdmin(user: UserPrincipal): boolean {
    return user.role === UserRole.ADMIN;
  }

  /**
   * Check if user is manager or above
   */
  isManagerOrAbove(user: UserPrincipal): boolean {
    return [UserRole.ADMIN, UserRole.MANAGER].includes(user.role as UserRole);
  }

  /**
   * Check if user can access resource based on ownership
   */
  canAccessOwnResource(user: UserPrincipal, resourceOwnerId: string): boolean {
    return user.id === resourceOwnerId || this.isManagerOrAbove(user);
  }

  /**
   * Get all permissions for a role
   */
  getUserPermissions(role: string): Permission[] {
    return this.rolePermissions.get(role) || [];
  }

  /**
   * Add permission to role
   */
  addPermissionToRole(role: string, permission: Permission): void {
    const permissions = this.rolePermissions.get(role) || [];
    permissions.push(permission);
    this.rolePermissions.set(role, permissions);
  }

  /**
   * Remove permission from role
   */
  removePermissionFromRole(role: string, resource: string, action: string): void {
    const permissions = this.rolePermissions.get(role) || [];
    const filteredPermissions = permissions.filter(
      p => !(p.resource === resource && p.action === action)
    );
    this.rolePermissions.set(role, filteredPermissions);
  }

  /**
   * Check if user can perform bulk operations
   */
  canPerformBulkOperation(user: UserPrincipal, resource: Resource): boolean {
    return this.hasPermission(user, resource, Action.MANAGE) || this.isAdmin(user);
  }

  /**
   * Get allowed actions for user on resource
   */
  getAllowedActions(user: UserPrincipal, resource: Resource): Action[] {
    const userPermissions = this.getUserPermissions(user.role);
    const allowedActions: Action[] = [];

    for (const action of Object.values(Action)) {
      if (userPermissions.some(p => 
        (p.resource === resource || p.resource === '*') && 
        (p.action === action || p.action === '*')
      )) {
        allowedActions.push(action);
      }
    }

    return allowedActions;
  }

  /**
   * Initialize default role permissions based on Spring Security configuration
   */
  private initializeDefaultPermissions(): void {
    // ADMIN permissions - full access to everything
    this.rolePermissions.set(UserRole.ADMIN, [
      { resource: '*', action: '*' }, // Full access
    ]);

    // MANAGER permissions
    this.rolePermissions.set(UserRole.MANAGER, [
      // User management
      { resource: Resource.USER, action: Action.READ },
      { resource: Resource.USER, action: Action.LIST },
      { resource: Resource.USER, action: Action.UPDATE, conditions: { ownResource: true } },
      
      // Product management
      { resource: Resource.PRODUCT, action: '*' },
      { resource: Resource.CATEGORY, action: '*' },
      
      // Supplier management
      { resource: Resource.SUPPLIER, action: '*' },
      
      // Inventory management
      { resource: Resource.INVENTORY, action: '*' },
      
      // Order management
      { resource: Resource.ORDER, action: '*' },
      
      // Reports
      { resource: Resource.REPORT, action: Action.READ },
      { resource: Resource.REPORT, action: Action.LIST },
      
      // File management
      { resource: Resource.FILE, action: '*' },
    ]);

    // EMPLOYEE permissions
    this.rolePermissions.set(UserRole.EMPLOYEE, [
      // Limited user access
      { resource: Resource.USER, action: Action.READ, conditions: { ownResource: true } },
      { resource: Resource.USER, action: Action.UPDATE, conditions: { ownResource: true } },
      
      // Product access
      { resource: Resource.PRODUCT, action: Action.READ },
      { resource: Resource.PRODUCT, action: Action.LIST },
      { resource: Resource.PRODUCT, action: Action.CREATE },
      { resource: Resource.PRODUCT, action: Action.UPDATE },
      
      // Category access
      { resource: Resource.CATEGORY, action: Action.READ },
      { resource: Resource.CATEGORY, action: Action.LIST },
      
      // Inventory access
      { resource: Resource.INVENTORY, action: '*' },
      
      // Order access
      { resource: Resource.ORDER, action: '*' },
      
      // File access
      { resource: Resource.FILE, action: Action.CREATE },
      { resource: Resource.FILE, action: Action.READ },
      { resource: Resource.FILE, action: Action.UPDATE, conditions: { ownResource: true } },
    ]);

    // USER permissions (basic user)
    this.rolePermissions.set(UserRole.USER, [
      // Own profile only
      { resource: Resource.USER, action: Action.READ, conditions: { ownResource: true } },
      { resource: Resource.USER, action: Action.UPDATE, conditions: { ownResource: true } },
      
      // Read-only access to products and categories
      { resource: Resource.PRODUCT, action: Action.READ },
      { resource: Resource.PRODUCT, action: Action.LIST },
      { resource: Resource.CATEGORY, action: Action.READ },
      { resource: Resource.CATEGORY, action: Action.LIST },
    ]);
  }

  /**
   * Check if conditions are met
   */
  private checkConditions(
    permissionConditions?: Record<string, any>,
    requestConditions?: Record<string, any>,
    user?: UserPrincipal
  ): boolean {
    if (!permissionConditions) {
      return true;
    }

    // Check own resource condition
    if (permissionConditions.ownResource && requestConditions?.resourceOwnerId) {
      return user?.id === requestConditions.resourceOwnerId;
    }

    // Check department condition
    if (permissionConditions.department && requestConditions?.department) {
      return permissionConditions.department === requestConditions.department;
    }

    // Check time-based conditions
    if (permissionConditions.timeRestriction) {
      const now = new Date();
      const startTime = new Date(permissionConditions.timeRestriction.start);
      const endTime = new Date(permissionConditions.timeRestriction.end);
      
      if (now < startTime || now > endTime) {
        return false;
      }
    }

    // Add more condition checks as needed
    return true;
  }

  /**
   * Create permission object
   */
  static createPermission(
    resource: Resource | string,
    action: Action | string,
    conditions?: Record<string, any>
  ): Permission {
    return { resource, action, conditions };
  }
}