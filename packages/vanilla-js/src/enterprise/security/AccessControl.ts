interface Permission {
    id: string;
    name: string;
    resource: string;
    actions: string[]; // e.g., ['read', 'write', 'delete']
    conditions?: Record<string, any>; // e.g., { owner: true, department: 'engineering' }
}

interface Role {
    id: string;
    name: string;
    description: string;
    permissions: Permission[];
    hierarchyLevel: number;
    inheritsFrom?: string[];
    expiresAt?: Date;
}

interface User {
    id: string;
    username: string;
    roles: string[];
    directPermissions?: Permission[];
    attributes: Record<string, any>; // e.g., { department: 'engineering', level: 'senior' }
    sessionExpiry?: Date;
    mfaEnabled: boolean;
    lastLogin?: Date;
}

interface AccessRequest {
    userId: string;
    resource: string;
    action: string;
    context?: Record<string, any>;
    timestamp: Date;
}

interface AccessResult {
    granted: boolean;
    reason: string;
    matchingPermissions: Permission[];
    missingPermissions?: Permission[];
    requiresMFA?: boolean;
}

export class AccessControl {
    private users = new Map<string, User>();
    private roles = new Map<string, Role>();
    private permissions = new Map<string, Permission>();
    private sessions = new Map<string, { userId: string; expiresAt: Date; mfaVerified: boolean }>();

    constructor() {
        this.initializeDefaultRoles();
    }

    private initializeDefaultRoles(): void {
        // Default admin role
        const adminRole: Role = {
            id: 'admin',
            name: 'Administrator',
            description: 'Full system access',
            permissions: [{
                id: 'admin_all',
                name: 'Admin All',
                resource: '*',
                actions: ['*']
            }],
            hierarchyLevel: 100
        };

        // Default user role
        const userRole: Role = {
            id: 'user',
            name: 'User',
            description: 'Basic user access',
            permissions: [{
                id: 'user_search',
                name: 'User Search',
                resource: 'search',
                actions: ['read']
            }],
            hierarchyLevel: 10
        };

        // Viewer role
        const viewerRole: Role = {
            id: 'viewer',
            name: 'Viewer',
            description: 'Read-only access',
            permissions: [{
                id: 'viewer_read',
                name: 'Viewer Read',
                resource: '*',
                actions: ['read']
            }],
            hierarchyLevel: 5
        };

        this.roles.set(adminRole.id, adminRole);
        this.roles.set(userRole.id, userRole);
        this.roles.set(viewerRole.id, viewerRole);

        adminRole.permissions.forEach(p => this.permissions.set(p.id, p));
        userRole.permissions.forEach(p => this.permissions.set(p.id, p));
        viewerRole.permissions.forEach(p => this.permissions.set(p.id, p));
    }

    createUser(
        id: string,
        username: string,
        roles: string[] = ['user'],
        attributes: Record<string, any> = {},
        mfaEnabled = false
    ): User {
        const user: User = {
            id,
            username,
            roles: roles.filter(roleId => this.roles.has(roleId)),
            attributes,
            mfaEnabled
        };

        this.users.set(id, user);
        return user;
    }

    createRole(
        id: string,
        name: string,
        description: string,
        permissions: Permission[],
        hierarchyLevel: number,
        inheritsFrom?: string[],
        expiresAt?: Date
    ): Role {
        const role: Role = {
            id,
            name,
            description,
            permissions,
            hierarchyLevel,
            inheritsFrom,
            expiresAt
        };

        this.roles.set(id, role);
        permissions.forEach(p => this.permissions.set(p.id, p));
        return role;
    }

    createPermission(
        id: string,
        name: string,
        resource: string,
        actions: string[],
        conditions?: Record<string, any>
    ): Permission {
        const permission: Permission = {
            id,
            name,
            resource,
            actions,
            conditions
        };

        this.permissions.set(id, permission);
        return permission;
    }

    assignRoleToUser(userId: string, roleId: string): boolean {
        const user = this.users.get(userId);
        const role = this.roles.get(roleId);

        if (!user || !role) {
            return false;
        }

        if (!user.roles.includes(roleId)) {
            user.roles.push(roleId);
        }

        return true;
    }

    removeRoleFromUser(userId: string, roleId: string): boolean {
        const user = this.users.get(userId);
        if (!user) {
            return false;
        }

        user.roles = user.roles.filter(r => r !== roleId);
        return true;
    }

    grantDirectPermission(userId: string, permission: Permission): boolean {
        const user = this.users.get(userId);
        if (!user) {
            return false;
        }

        if (!user.directPermissions) {
            user.directPermissions = [];
        }

        user.directPermissions.push(permission);
        this.permissions.set(permission.id, permission);
        return true;
    }

    checkAccess(request: AccessRequest): AccessResult {
        const user = this.users.get(request.userId);
        if (!user) {
            return {
                granted: false,
                reason: 'User not found',
                matchingPermissions: []
            };
        }

        // Check if user session is valid
        if (user.sessionExpiry && new Date() > user.sessionExpiry) {
            return {
                granted: false,
                reason: 'Session expired',
                matchingPermissions: []
            };
        }

        const userPermissions = this.getUserPermissions(user);
        const matchingPermissions = this.findMatchingPermissions(
            userPermissions,
            request.resource,
            request.action
        );

        if (matchingPermissions.length === 0) {
            return {
                granted: false,
                reason: 'Insufficient permissions',
                matchingPermissions: [],
                missingPermissions: [{
                    id: 'required',
                    name: 'Required Permission',
                    resource: request.resource,
                    actions: [request.action]
                }]
            };
        }

        // Check conditions
        const validPermissions = matchingPermissions.filter(p =>
            this.evaluateConditions(p, user, request.context)
        );

        if (validPermissions.length === 0) {
            return {
                granted: false,
                reason: 'Permission conditions not met',
                matchingPermissions: []
            };
        }

        // Check if MFA is required for sensitive actions
        const requiresMFA = this.requiresMFA(request, validPermissions);
        if (requiresMFA && (!user.mfaEnabled || !this.isMFAVerified(request.userId))) {
            return {
                granted: false,
                reason: 'Multi-factor authentication required',
                matchingPermissions: validPermissions,
                requiresMFA: true
            };
        }

        return {
            granted: true,
            reason: 'Access granted',
            matchingPermissions: validPermissions
        };
    }

    private getUserPermissions(user: User): Permission[] {
        const permissions: Permission[] = [];

        // Add direct permissions
        if (user.directPermissions) {
            permissions.push(...user.directPermissions);
        }

        // Add role-based permissions
        for (const roleId of user.roles) {
            const role = this.roles.get(roleId);
            if (role && (!role.expiresAt || new Date() <= role.expiresAt)) {
                permissions.push(...role.permissions);

                // Add inherited permissions
                if (role.inheritsFrom) {
                    for (const inheritedRoleId of role.inheritsFrom) {
                        const inheritedRole = this.roles.get(inheritedRoleId);
                        if (inheritedRole && (!inheritedRole.expiresAt || new Date() <= inheritedRole.expiresAt)) {
                            permissions.push(...inheritedRole.permissions);
                        }
                    }
                }
            }
        }

        // Remove duplicates
        const uniquePermissions = permissions.filter((permission, index, self) =>
            index === self.findIndex(p => p.id === permission.id)
        );

        return uniquePermissions;
    }

    private findMatchingPermissions(
        permissions: Permission[],
        resource: string,
        action: string
    ): Permission[] {
        return permissions.filter(permission => {
            const resourceMatch = permission.resource === '*' ||
                permission.resource === resource ||
                this.matchesResourcePattern(permission.resource, resource);

            const actionMatch = permission.actions.includes('*') ||
                permission.actions.includes(action);

            return resourceMatch && actionMatch;
        });
    }

    private matchesResourcePattern(pattern: string, resource: string): boolean {
        if (pattern.includes('*')) {
            const regexPattern = pattern
                .replace(/\./g, '\\.')
                .replace(/\*/g, '.*');
            return new RegExp(`^${regexPattern}$`).test(resource);
        }
        return pattern === resource;
    }

    private evaluateConditions(
        permission: Permission,
        user: User,
        context?: Record<string, any>
    ): boolean {
        if (!permission.conditions) {
            return true;
        }

        for (const [conditionKey, conditionValue] of Object.entries(permission.conditions)) {
            if (conditionKey === 'owner') {
                if (conditionValue && (!context || context.ownerId !== user.id)) {
                    return false;
                }
            } else if (conditionKey === 'department') {
                if (user.attributes.department !== conditionValue) {
                    return false;
                }
            } else if (conditionKey === 'level') {
                if (user.attributes.level !== conditionValue) {
                    return false;
                }
            } else if (conditionKey === 'timeRange') {
                if (!this.isWithinTimeRange(conditionValue)) {
                    return false;
                }
            } else if (conditionKey === 'ipRange') {
                if (!this.isWithinIPRange(conditionValue, context?.ip)) {
                    return false;
                }
            }
        }

        return true;
    }

    private isWithinTimeRange(timeRange: { start: string; end: string }): boolean {
        const now = new Date();
        const currentTime = now.getHours() * 100 + now.getMinutes();

        const start = parseInt(timeRange.start.replace(':', ''));
        const end = parseInt(timeRange.end.replace(':', ''));

        if (start <= end) {
            return currentTime >= start && currentTime <= end;
        } else {
            // Spans midnight
            return currentTime >= start || currentTime <= end;
        }
    }

    private isWithinIPRange(ipRange: string, clientIP?: string): boolean {
        if (!clientIP) return false;

        // Simple IP range check (in production, use a proper IP library)
        if (ipRange.includes('/')) {
            // CIDR notation
            const [network, prefixLength] = ipRange.split('/');
            // Simplified check - in production use proper CIDR matching
            return clientIP.startsWith(network.split('.').slice(0, Math.floor(parseInt(prefixLength) / 8)).join('.'));
        } else {
            // Exact match
            return clientIP === ipRange;
        }
    }

    private requiresMFA(request: AccessRequest, permissions: Permission[]): boolean {
        const sensitiveActions = ['delete', 'admin', 'export', 'modify_permissions'];
        const sensitiveResources = ['admin', 'users', 'roles', 'permissions'];

        return sensitiveActions.includes(request.action) ||
            sensitiveResources.some(resource => request.resource.includes(resource)) ||
            permissions.some(p => p.resource === '*' && p.actions.includes('*'));
    }

    private isMFAVerified(userId: string): boolean {
        // In a real implementation, this would check if MFA has been verified for the current session
        // For now, we'll assume it's verified if the user has MFA enabled
        const user = this.users.get(userId);
        return user?.mfaEnabled || false;
    }

    createSession(userId: string, expiryMinutes = 480): string { // 8 hours default
        const sessionId = Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

        this.sessions.set(sessionId, {
            userId,
            expiresAt,
            mfaVerified: false
        });

        return sessionId;
    }

    validateSession(sessionId: string): { valid: boolean; userId?: string; requiresMFA?: boolean } {
        const session = this.sessions.get(sessionId);

        if (!session) {
            return { valid: false };
        }

        if (new Date() > session.expiresAt) {
            this.sessions.delete(sessionId);
            return { valid: false };
        }

        return {
            valid: true,
            userId: session.userId,
            requiresMFA: !session.mfaVerified
        };
    }

    verifyMFA(sessionId: string): boolean {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.mfaVerified = true;
            return true;
        }
        return false;
    }

    revokeSession(sessionId: string): boolean {
        return this.sessions.delete(sessionId);
    }

    getUserRoles(userId: string): Role[] {
        const user = this.users.get(userId);
        if (!user) return [];

        return user.roles
            .map(roleId => this.roles.get(roleId))
            .filter((role): role is Role => role !== undefined);
    }

    getUserPermissions(userId: string): Permission[] {
        const user = this.users.get(userId);
        if (!user) return [];

        return this.getUserPermissions(user);
    }

    elevatePermissions(
        userId: string,
        targetUserId: string,
        newRoles: string[],
        reason: string,
        durationMinutes = 60
    ): boolean {
        // Check if the requesting user has admin privileges
        const adminAccess = this.checkAccess({
            userId,
            resource: 'users',
            action: 'modify_permissions',
            timestamp: new Date()
        });

        if (!adminAccess.granted) {
            return false;
        }

        const targetUser = this.users.get(targetUserId);
        if (!targetUser) {
            return false;
        }

        // Store original roles for restoration
        const originalRoles = [...targetUser.roles];

        // Apply elevated roles
        targetUser.roles = [...new Set([...targetUser.roles, ...newRoles])];

        // Set up automatic role restoration
        setTimeout(() => {
            const user = this.users.get(targetUserId);
            if (user) {
                user.roles = originalRoles;
            }
        }, durationMinutes * 60 * 1000);

        return true;
    }

    getAccessReport(userId: string): {
        user: User;
        roles: Role[];
        permissions: Permission[];
        effectivePermissions: {
            resources: string[];
            actions: Record<string, string[]>;
        };
    } {
        const user = this.users.get(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const roles = this.getUserRoles(userId);
        const permissions = this.getUserPermissions(userId);

        const resources = [...new Set(permissions.map(p => p.resource))];
        const actions: Record<string, string[]> = {};

        permissions.forEach(p => {
            if (!actions[p.resource]) {
                actions[p.resource] = [];
            }
            actions[p.resource].push(...p.actions);
        });

        // Remove duplicates from actions
        Object.keys(actions).forEach(resource => {
            actions[resource] = [...new Set(actions[resource])];
        });

        return {
            user,
            roles,
            permissions,
            effectivePermissions: {
                resources,
                actions
            }
        };
    }

    cleanupExpiredSessions(): void {
        const now = new Date();
        for (const [sessionId, session] of this.sessions) {
            if (now > session.expiresAt) {
                this.sessions.delete(sessionId);
            }
        }
    }

    // Utility methods for common permission checks
    canRead(userId: string, resource: string): boolean {
        return this.checkAccess({ userId, resource, action: 'read', timestamp: new Date() }).granted;
    }

    canWrite(userId: string, resource: string): boolean {
        return this.checkAccess({ userId, resource, action: 'write', timestamp: new Date() }).granted;
    }

    canDelete(userId: string, resource: string): boolean {
        return this.checkAccess({ userId, resource, action: 'delete', timestamp: new Date() }).granted;
    }

    isAdmin(userId: string): boolean {
        const user = this.users.get(userId);
        return user?.roles.includes('admin') || false;
    }
}