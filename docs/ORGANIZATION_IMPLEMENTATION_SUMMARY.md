# Organization Management Implementation Summary

## Overview

Complete implementation of multi-organization system with strict restrictions. Organizations can manage users and assign roles/permissions, but cannot create or delete system resources. Only superadmin has full system control.

## Architecture

### Folder Structure

```
lib/
├── organization/
│   ├── constants.ts          # Restricted roles/permissions definitions
│   ├── validation.ts          # Validation utilities
│   ├── context.ts             # Organization context management
│   ├── actions.ts             # Organization CRUD operations
│   ├── users.ts               # Organization user management
│   └── roles.ts               # Get assignable roles/permissions
```

### Key Files

1. **`lib/organization/constants.ts`**
   - Defines restricted roles: `superadmin`, `system-admin`, `platform-admin`
   - Defines restricted permissions: `organization.*`, `role.*`, `permission.*`, `menu.*`, `system.*`, `platform.*`
   - Defines privileged roles for auditing: `admin`, `administrator`, `manager`, `director`

2. **`lib/organization/validation.ts`**
   - `isSuperadmin()` - Check if user is superadmin
   - `validateRoleAssignment()` - Validate role assignment (prevents restricted roles)
   - `validatePermissionAssignment()` - Validate permission assignment
   - `validateResourceCreation()` - Only superadmin can create resources
   - `shouldAuditRoleAssignment()` - Check if role assignment should be audited

3. **`lib/organization/users.ts`**
   - `addUserToOrganization()` - Add user to organization with role assignment
   - `assignRolesToUserInOrganization()` - Assign roles to user
   - `getOrganizationUsers()` - Get users in organization
   - `removeUserFromOrganization()` - Remove user from organization

4. **`lib/organization/roles.ts`**
   - `getAssignableRoles()` - Get roles organization can assign
   - `getAssignablePermissions()` - Get permissions organization can assign

## Security Model

### Organization Capabilities

✅ **CAN DO:**
- Add/remove users to/from organization
- Assign existing roles to users
- Assign existing permissions to roles
- View users, roles, permissions in their organization

❌ **CANNOT DO:**
- Create roles, permissions, menus
- Delete roles, permissions, menus
- Assign superadmin or restricted roles
- Assign restricted permissions
- Access other organizations' data

### Superadmin Capabilities

✅ **CAN DO:**
- Everything organizations can do
- Create/update/delete roles, permissions, menus
- Create/update/delete organizations
- Assign any role/permission to any user
- Access all organizations

## Validation Flow

### Role Assignment Validation

```typescript
1. Check if user is superadmin → If yes, allow
2. Get organization context
3. Validate role belongs to organization
4. Check if role is restricted → If yes, reject with error
5. Check if role is privileged → If yes, create audit log
6. Assign role
```

### Permission Assignment Validation

```typescript
1. Check if user is superadmin → If yes, allow
2. Get organization context
3. Validate permission belongs to organization
4. Check if permission is restricted → If yes, reject with error
5. Assign permission
```

### Resource Creation Validation

```typescript
1. Check if user is superadmin → If no, reject with error
2. Validate input
3. Check uniqueness (slug + organizationId)
4. Create resource
5. Audit log
```

## Error Messages

Organizations receive clear, actionable error messages:

- **Restricted Role**: `"Cannot assign restricted role 'superadmin'. Only superadmin can assign this role."`
- **Cross-Organization**: `"Cannot assign role 'X' from another organization."`
- **Global Role**: `"Cannot assign global role 'X'. Only superadmin can assign global roles."`
- **Create Resource**: `"Only superadmin can create roles. Organizations can only assign existing roles to users."`

## Audit Logging

### Privileged Role Assignments

When an organization assigns a privileged role (`admin`, `administrator`, `manager`, `director`), an audit log entry is created:

```typescript
{
  action: "ASSIGN_PRIVILEGED_ROLE",
  resource: "UserRole",
  resourceId: userId,
  description: "Privileged role 'admin' assigned to user",
  organizationId: orgId,
  metadata: {
    userId,
    roleId,
    roleSlug: "admin"
  }
}
```

## Usage Examples

### Organization Adds User

```typescript
import { addUserToOrganization } from "@/lib/organization/users";

const result = await addUserToOrganization({
  email: "user@example.com",
  username: "user123",
  firstName: "John",
  lastName: "Doe",
  roleIds: ["role-id-1", "role-id-2"], // Must be assignable roles
});

if (result.success) {
  // User added successfully
  // Generated password returned if not provided
}
```

### Organization Assigns Roles

```typescript
import { assignRolesToUserInOrganization } from "@/lib/organization/users";

const result = await assignRolesToUserInOrganization({
  userId: "user-id",
  roleIds: ["role-id-1"], // Validated against restrictions
});

if (!result.success) {
  // Error message explains why assignment failed
  console.error(result.error);
}
```

### Get Assignable Roles

```typescript
import { getAssignableRoles } from "@/lib/organization/roles";

const result = await getAssignableRoles();
if (result.success) {
  // Returns only roles organization can assign
  // Excludes superadmin and roles from other organizations
  result.roles.forEach(role => {
    console.log(role.name, role.isGlobal);
  });
}
```

## Database Schema Updates

All resources now have `organizationId`:

- **Role**: `organizationId` (null = global, e.g., superadmin)
- **Permission**: `organizationId` (null = global)
- **Menu**: `organizationId` (null = global)
- **UserRole**: `organizationId` (for performance)
- **AuditLog**: `organizationId` (for isolation)
- **Blog**: `organizationId` (for isolation)

Unique constraints are organization-aware:
- `@@unique([slug, organizationId])` on Role, Permission, Menu

## Migration Path

1. **Run Prisma Migration**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

2. **Migrate Existing Data**
   - Create default organization
   - Assign all existing data to default organization
   - Keep superadmin role global (organizationId = null)

3. **Update Code**
   - Use organization context in queries
   - Add validation to role/permission assignment
   - Update UI to show organization switcher

## Testing Checklist

- [ ] Organization can add users
- [ ] Organization can assign roles (non-restricted)
- [ ] Organization cannot assign superadmin role
- [ ] Organization cannot create roles
- [ ] Organization cannot create permissions
- [ ] Organization cannot create menus
- [ ] Superadmin can do everything
- [ ] Privileged role assignments are audited
- [ ] Cross-organization access is prevented
- [ ] Error messages are clear and actionable

## Best Practices

1. **Always validate** before assignment, not just at UI level
2. **Audit privileged** role assignments
3. **Use organization context** in all queries
4. **Clear error messages** for better UX
5. **Separate concerns** - validation, actions, context management
6. **Type safety** - use Zod schemas for validation

## Security Considerations

1. **Database Level**: Unique constraints prevent duplicate roles/permissions per organization
2. **Application Level**: Validation functions enforce restrictions
3. **Audit Level**: All privileged actions are logged
4. **Middleware Level**: Organization context validated on every request
5. **Cookie Security**: Organization context stored in HTTP-only cookie

## Future Enhancements

- Role templates for quick organization setup
- Bulk user import for organizations
- Organization-level settings/configurations
- Role approval workflow for privileged roles
- Organization hierarchies (parent-child)

