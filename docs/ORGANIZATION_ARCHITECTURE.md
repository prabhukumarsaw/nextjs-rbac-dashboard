# Multi-Organization Architecture

## Overview

The multi-organization system adds a tenant isolation layer to the RBAC dashboard without breaking existing functionality. Each organization operates as an independent tenant with its own users, roles, permissions, and modules.

## Design Principles

1. **Backward Compatibility**: Existing functionality continues to work
2. **Isolation**: Organizations are completely isolated from each other
3. **Superadmin Access**: Global superadmin can access all organizations
4. **Flexibility**: Users can belong to multiple organizations
5. **Scalability**: Designed to handle thousands of organizations

## Database Schema

### Core Models

#### Organization
- Central tenant model
- Each organization has unique `slug` identifier
- Stores organization metadata and settings

#### User
- Global user identity (email/username unique globally)
- Can belong to multiple organizations via `UserOrganization` junction
- Maintains single authentication across all organizations

#### UserOrganization
- Junction table linking users to organizations
- Tracks user's membership status in each organization
- Allows users to have different roles in different organizations

#### Role, Permission, Menu
- All scoped to organizations via `organizationId`
- `organizationId = null` = Global resource (available to all orgs)
- Superadmin role should be global (`organizationId = null`)

#### UserRole
- Links users to roles within organization context
- `organizationId` field for performance (can be derived from role)
- Allows same user to have different roles in different organizations

### Key Relationships

```
Organization
  ├── Users (via UserOrganization)
  ├── Roles
  ├── Permissions
  ├── Menus
  ├── AuditLogs
  └── Blogs

User
  ├── Organizations (via UserOrganization) - Many-to-Many
  ├── Roles (via UserRole) - Scoped per organization
  ├── AuditLogs
  └── Blogs

Role
  ├── Organization (optional, null for global)
  ├── Users (via UserRole)
  ├── Permissions (via RolePermission)
  └── Menus (via RoleMenu)
```

## Organization Context Management

### Cookie-Based Context

Organization context is managed via HTTP-only cookie (`current-organization-id`):

- **Advantages**:
  - No need to regenerate JWT tokens when switching
  - Can be updated without re-authentication
  - Server-side only (secure)

- **Flow**:
  1. User logs in → Gets default organization
  2. User switches organization → Cookie updated
  3. All queries filter by current organization

### Context Functions

```typescript
// Get current organization ID
getCurrentOrganizationId(): Promise<string | null>

// Set current organization
setCurrentOrganizationId(orgId: string): Promise<void>

// Get organization filter for queries
buildOrganizationFilter(includeGlobal: boolean): Promise<Filter>
```

## Permission System Updates

### Superadmin Behavior

- Superadmin role with `organizationId = null` is global
- Bypasses all organization filters
- Can access all organizations
- Can create/manage organizations

### Regular Users

- Permissions checked within organization context
- Can only access resources in their organizations
- Role assignments are organization-specific

### Permission Check Flow

```
1. Check if user is superadmin (global role)
   → If yes: Grant access
   
2. Get current organization context
   → If no org: Deny access
   
3. Check permission in organization context
   → Query roles/permissions filtered by organization
   
4. Return result
```

## Query Patterns

### Filtering by Organization

```typescript
// Get organization filter
const orgFilter = await buildOrganizationFilter(true);

// Query with filter
const roles = await prisma.role.findMany({
  where: {
    ...orgFilter, // Includes org-specific + global (null)
    isActive: true,
  },
});
```

### Superadmin Queries

```typescript
// Superadmin sees all
const orgFilter = await buildOrganizationFilter(true);
// Returns undefined for superadmin (no filter)

const users = await prisma.user.findMany({
  where: orgFilter, // No filter = all users
});
```

### Regular User Queries

```typescript
// Regular user sees only their org
const orgId = await getCurrentOrganizationId();

const users = await prisma.user.findMany({
  where: {
    organizations: {
      some: {
        organizationId: orgId,
        isActive: true,
      },
    },
  },
});
```

## Migration Strategy

### Phase 1: Schema Update
- Add Organization model
- Add organizationId fields to existing models
- Add UserOrganization junction table
- Make unique constraints organization-aware

### Phase 2: Data Migration
- Create default organization
- Migrate all existing data to default organization
- Keep superadmin role global (organizationId = null)

### Phase 3: Code Updates
- Update queries to include organization filters
- Add organization context management
- Update permission checks
- Add organization switcher UI

### Phase 4: Testing
- Test backward compatibility
- Test organization isolation
- Test superadmin access
- Test multi-organization users

## Security Considerations

### Isolation Enforcement

1. **Database Level**: Unique constraints per organization
2. **Application Level**: All queries filtered by organization
3. **Middleware Level**: Organization context validation

### Access Control

- Users can only access organizations they belong to
- Superadmin bypasses all restrictions
- Organization admins can manage their organization only

### Audit Logging

- All actions logged with organization context
- Enables compliance and security tracking per organization
- Helps with troubleshooting organization-specific issues

## Performance Optimizations

### Indexing

All organization-related fields are indexed:
- `organizationId` on all models
- Composite indexes for unique constraints
- Foreign key indexes

### Caching Strategy

- Organization context cached in cookie (30 days)
- Permission checks can be cached per user+organization
- Menu structures cached per organization

### Query Optimization

- Use `include` to fetch related data in single query
- Filter at database level (not application level)
- Use Prisma's relation filters efficiently

## Use Cases

### Single Organization (Current State)
- All users in default organization
- Works exactly as before
- No breaking changes

### Multiple Organizations
- Each organization isolated
- Users can belong to multiple
- Superadmin manages all

### Enterprise Multi-Tenant
- Thousands of organizations
- Each with own modules/users
- Centralized superadmin management

## API Examples

### Create Organization
```typescript
await createOrganization({
  name: "Maharashtra State",
  slug: "state-maharashtra",
  description: "Maharashtra state organization",
});
```

### Switch Organization
```typescript
await setCurrentOrganizationId(organizationId);
// All subsequent queries use this organization
```

### Get Organization Users
```typescript
const orgId = await getCurrentOrganizationId();
const users = await getUsersInOrganization(orgId);
```

## Best Practices

1. **Always use organization context** in queries
2. **Check superadmin** before applying filters
3. **Validate organization access** before operations
4. **Log with organization context** in audit logs
5. **Use transactions** for multi-step operations
6. **Cache organization data** appropriately

## Future Enhancements

- Organization-level settings/configurations
- Organization hierarchies (parent-child)
- Cross-organization collaboration
- Organization-level billing/subscriptions
- Organization templates for quick setup

