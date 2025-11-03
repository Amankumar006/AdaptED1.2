import { logger } from '../utils/logger';
import { 
  User, 
  Permission, 
  Role, 
  AuthContext 
} from '../types/auth.types';

interface AccessControlContext {
  user: User;
  resource: string;
  action: string;
  resourceId?: string;
  organizationId?: string;
  attributes?: Record<string, any>;
}

interface PolicyRule {
  id: string;
  name: string;
  resource: string;
  action: string;
  effect: 'allow' | 'deny';
  conditions?: PolicyCondition[];
  priority: number;
}

interface PolicyCondition {
  attribute: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'contains' | 'regex';
  value: any;
}

class AuthorizationService {
  private policies: PolicyRule[] = [];

  constructor() {
    this.initializeDefaultPolicies();
  }

  /**
   * Check if user has permission to perform action on resource
   */
  async hasPermission(context: AccessControlContext): Promise<boolean> {
    try {
      // First check role-based permissions
      const roleBasedAccess = await this.checkRoleBasedAccess(context);
      
      // Then check attribute-based policies
      const policyBasedAccess = await this.checkPolicyBasedAccess(context);
      
      // Combine results (policies can override role-based access)
      const hasAccess = this.combineAccessDecisions(roleBasedAccess, policyBasedAccess);
      
      logger.debug(`Access check for user ${context.user.id}`, {
        resource: context.resource,
        action: context.action,
        roleBasedAccess,
        policyBasedAccess,
        finalDecision: hasAccess
      });
      
      return hasAccess;
    } catch (error) {
      logger.error('Permission check error:', error);
      return false; // Fail secure
    }
  }

  /**
   * Check role-based access control
   */
  private async checkRoleBasedAccess(context: AccessControlContext): Promise<boolean> {
    const { user, resource, action, organizationId } = context;
    
    // Get user roles for the specific organization or global roles
    const relevantRoles = user.roles.filter(role => 
      !role.organizationId || 
      role.organizationId === organizationId
    );
    
    // Check if any role has the required permission
    for (const role of relevantRoles) {
      const hasPermission = role.permissions.some(permission =>
        this.matchesPermission(permission, resource, action)
      );
      
      if (hasPermission) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check attribute-based access control policies
   */
  private async checkPolicyBasedAccess(context: AccessControlContext): Promise<boolean | null> {
    const applicablePolicies = this.policies.filter(policy =>
      policy.resource === context.resource && policy.action === context.action
    );
    
    if (applicablePolicies.length === 0) {
      return null; // No policies apply, defer to role-based access
    }
    
    // Sort policies by priority (higher priority first)
    applicablePolicies.sort((a, b) => b.priority - a.priority);
    
    // Evaluate policies in priority order
    for (const policy of applicablePolicies) {
      const policyResult = await this.evaluatePolicy(policy, context);
      
      if (policyResult !== null) {
        return policyResult;
      }
    }
    
    return null; // No policies matched
  }

  /**
   * Evaluate a single policy
   */
  private async evaluatePolicy(policy: PolicyRule, context: AccessControlContext): Promise<boolean | null> {
    if (!policy.conditions || policy.conditions.length === 0) {
      return policy.effect === 'allow';
    }
    
    // All conditions must be true for policy to apply
    const allConditionsMet = policy.conditions.every(condition =>
      this.evaluateCondition(condition, context)
    );
    
    if (allConditionsMet) {
      return policy.effect === 'allow';
    }
    
    return null; // Policy doesn't apply
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: PolicyCondition, context: AccessControlContext): boolean {
    const attributeValue = this.getAttributeValue(condition.attribute, context);
    
    switch (condition.operator) {
      case 'equals':
        return attributeValue === condition.value;
      
      case 'not_equals':
        return attributeValue !== condition.value;
      
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(attributeValue);
      
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(attributeValue);
      
      case 'greater_than':
        return typeof attributeValue === 'number' && attributeValue > condition.value;
      
      case 'less_than':
        return typeof attributeValue === 'number' && attributeValue < condition.value;
      
      case 'contains':
        return typeof attributeValue === 'string' && attributeValue.includes(condition.value);
      
      case 'regex':
        return typeof attributeValue === 'string' && new RegExp(condition.value).test(attributeValue);
      
      default:
        logger.warn(`Unknown condition operator: ${condition.operator}`);
        return false;
    }
  }

  /**
   * Get attribute value from context
   */
  private getAttributeValue(attribute: string, context: AccessControlContext): any {
    const parts = attribute.split('.');
    let value: any = context;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Check if permission matches resource and action
   */
  private matchesPermission(permission: Permission, resource: string, action: string): boolean {
    // Exact match
    if (permission.resource === resource && permission.action === action) {
      return true;
    }
    
    // Wildcard matching
    if (permission.resource === '*' || permission.action === '*') {
      return true;
    }
    
    // Pattern matching (e.g., "users:*" matches "users:read", "users:write")
    const resourcePattern = permission.resource.replace('*', '.*');
    const actionPattern = permission.action.replace('*', '.*');
    
    const resourceMatch = new RegExp(`^${resourcePattern}$`).test(resource);
    const actionMatch = new RegExp(`^${actionPattern}$`).test(action);
    
    return resourceMatch && actionMatch;
  }

  /**
   * Combine role-based and policy-based access decisions
   */
  private combineAccessDecisions(roleBasedAccess: boolean, policyBasedAccess: boolean | null): boolean {
    // If policies explicitly deny, deny access
    if (policyBasedAccess === false) {
      return false;
    }
    
    // If policies explicitly allow, allow access
    if (policyBasedAccess === true) {
      return true;
    }
    
    // If no policies apply, use role-based decision
    return roleBasedAccess;
  }

  /**
   * Get user permissions for a specific organization
   */
  async getUserPermissions(userId: string, organizationId?: string): Promise<Permission[]> {
    try {
      // TODO: Implement database lookup
      const user = await this.findUserById(userId);
      
      if (!user) {
        return [];
      }
      
      const relevantRoles = user.roles.filter(role =>
        !role.organizationId || role.organizationId === organizationId
      );
      
      const permissions: Permission[] = [];
      const permissionIds = new Set<string>();
      
      for (const role of relevantRoles) {
        for (const permission of role.permissions) {
          if (!permissionIds.has(permission.id)) {
            permissions.push(permission);
            permissionIds.add(permission.id);
          }
        }
      }
      
      return permissions;
    } catch (error) {
      logger.error('Get user permissions error:', error);
      return [];
    }
  }

  /**
   * Check if user has specific role
   */
  async hasRole(userId: string, roleName: string, organizationId?: string): Promise<boolean> {
    try {
      const user = await this.findUserById(userId);
      
      if (!user) {
        return false;
      }
      
      return user.roles.some(role =>
        role.name === roleName &&
        (!role.organizationId || role.organizationId === organizationId)
      );
    } catch (error) {
      logger.error('Role check error:', error);
      return false;
    }
  }

  /**
   * Get user roles for organization
   */
  async getUserRoles(userId: string, organizationId?: string): Promise<Role[]> {
    try {
      const user = await this.findUserById(userId);
      
      if (!user) {
        return [];
      }
      
      return user.roles.filter(role =>
        !role.organizationId || role.organizationId === organizationId
      );
    } catch (error) {
      logger.error('Get user roles error:', error);
      return [];
    }
  }

  /**
   * Add policy rule
   */
  addPolicy(policy: PolicyRule): void {
    this.policies.push(policy);
    logger.info(`Added policy: ${policy.name}`);
  }

  /**
   * Remove policy rule
   */
  removePolicy(policyId: string): void {
    const index = this.policies.findIndex(p => p.id === policyId);
    if (index !== -1) {
      const removed = this.policies.splice(index, 1)[0];
      logger.info(`Removed policy: ${removed.name}`);
    }
  }

  /**
   * Get all policies
   */
  getPolicies(): PolicyRule[] {
    return [...this.policies];
  }

  /**
   * Initialize default policies
   */
  private initializeDefaultPolicies(): void {
    // Example: Only allow users to access their own profile
    this.addPolicy({
      id: 'own-profile-access',
      name: 'Own Profile Access',
      resource: 'users',
      action: 'read',
      effect: 'allow',
      conditions: [
        {
          attribute: 'user.id',
          operator: 'equals',
          value: '${resourceId}'
        }
      ],
      priority: 100
    });

    // Example: Deny access to admin resources for non-admin users
    this.addPolicy({
      id: 'admin-resource-protection',
      name: 'Admin Resource Protection',
      resource: 'admin',
      action: '*',
      effect: 'deny',
      conditions: [
        {
          attribute: 'user.roles',
          operator: 'not_in',
          value: ['admin', 'super_admin']
        }
      ],
      priority: 200
    });

    // Example: Time-based access control
    this.addPolicy({
      id: 'business-hours-access',
      name: 'Business Hours Access',
      resource: 'sensitive-data',
      action: '*',
      effect: 'deny',
      conditions: [
        {
          attribute: 'attributes.currentHour',
          operator: 'less_than',
          value: 9
        }
      ],
      priority: 50
    });
  }

  /**
   * Mock user lookup - TODO: Replace with actual database implementation
   */
  private async findUserById(userId: string): Promise<User | null> {
    // Mock implementation - replace with actual database query
    if (userId === '1') {
      return {
        id: '1',
        email: 'test@example.com',
        roles: [
          {
            id: '1',
            name: 'student',
            permissions: [
              {
                id: '1',
                name: 'read_own_profile',
                resource: 'users',
                action: 'read'
              },
              {
                id: '2',
                name: 'view_content',
                resource: 'content',
                action: 'view'
              }
            ],
            hierarchy: 1
          }
        ],
        organizations: [
          {
            organizationId: 'org1',
            roles: ['student'],
            joinedAt: new Date()
          }
        ],
        profile: {
          firstName: 'Test',
          lastName: 'User',
          timezone: 'UTC',
          language: 'en',
          preferences: {}
        },
        mfaEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    return null;
  }

  /**
   * Create authorization context from user and request
   */
  createAuthContext(user: User, organizationId?: string): AuthContext {
    const relevantRoles = user.roles.filter(role =>
      !role.organizationId || role.organizationId === organizationId
    );

    const permissions: Permission[] = [];
    const permissionIds = new Set<string>();

    for (const role of relevantRoles) {
      for (const permission of role.permissions) {
        if (!permissionIds.has(permission.id)) {
          permissions.push(permission);
          permissionIds.add(permission.id);
        }
      }
    }

    return {
      user,
      permissions,
      organizationId
    };
  }
}

export const authorizationService = new AuthorizationService();