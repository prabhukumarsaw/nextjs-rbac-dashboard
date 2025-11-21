# Organization Restrictions & Permissions

## Overview

This document outlines the restrictions and permissions for organizations in the multi-tenant RBAC system. Organizations can manage users and assign roles/permissions, but cannot create or delete system resources.

## Organization Capabilities

### ✅ What Organizations CAN Do

1. **User Management**
   - Add users to their organization
   - Remove users from their organization
   - View users in their organization
   - Update user information within their organization

2. **Role Assignment**
   - Assign existing roles to users in their organization
   - Remove roles from users in their organization
   - View available roles (only their organization's roles + global roles)

3. **Permission Assignment**
   - Assign existing permissions to roles
   - View available permissions (only their organization's permissions + global permissions)

4. **Menu Access**
   - Assign menu access to roles
   - View available menus (only their organization's menus + global menus)

### ❌ What Organizations CANNOT Do

1. **Cannot Create**
   - ❌ Cannot create roles
   - ❌ Cannot create permissions
   - ❌ Cannot create menus
   - ❌ Cannot create organizations

2. **Cannot Delete**
   - ❌ Cannot delete roles
   - ❌ Cannot delete permissions
   - ❌ Cannot delete menus
   - ❌ Cannot delete organizations

3. **Cannot Assign Restricted Resources**
   - ❌ Cannot assign superadmin role
   - ❌ Cannot assign system-admin role
   - ❌ Cannot assign platform-admin role
   - ❌ Cannot assign global roles (organizationId = null)
   - ❌ Cannot assign restricted permissions (organization.*, role.*, permission.*, menu.*, system.*, platform.*)
   - ❌ Cannot assign roles/permissions from other organizations

## Superadmin Capabilities

### ✅ What Superadmin CAN Do

1. **Full System Access**
   - Create/update/delete roles
   - Create/update/delete permissions
   - Create/update/delete menus
   - Create/update/delete organizations
   - Access all organizations
   - Assign any role/permission to any user

2. **System Management**
   - Manage all organizations
   - Create global roles/permissions/menus
   - Assign superadmin role
   - System-wide configuration

## Restricted Roles

The following roles are restricted and cannot be assigned by organizations:

- `superadmin` - System-wide administrator
- `system-admin` - System administration
- `platform-admin` - Platform administration

**Validation**: Organizations attempting to assign these roles will receive an error:
```
"Cannot assign restricted role 'superadmin'. Only superadmin can assign this role."
```

## Restricted Permissions

The following permission patterns are restricted:

- `organization.*` - Organization management
- `role.create`, `role.delete` - Role creation/deletion
- `permission.create`, `permission.delete` - Permission creation/deletion
- `menu.create`, `menu.delete` - Menu creation/deletion
- `system.*` - System management
- `platform.*` - Platform management

**Validation**: Organizations attempting to assign these permissions will receive an error:
```
"Cannot assign restricted permission 'organization.create'. Only superadmin can assign this permission."
```

## Privileged Roles (Audited)

The following roles are considered privileged and will be audited when assigned:

- `admin`
- `administrator`
- `manager`
- `director`

**Behavior**: When an organization assigns these roles, an audit log entry is created with action `ASSIGN_PRIVILEGED_ROLE` for compliance tracking.

## Implementation Details

### Validation Flow

```typescript
// When organization tries to assign role
1. Check if user is superadmin → If yes, allow
2. Get organization context
3. Validate role belongs to organization
4. Check if role is restricted → If yes, reject
5. Check if role is privileged → If yes, audit
6. Assign role
```

### Error Messages

Organizations will receive clear error messages:

- **Restricted Role**: "Cannot assign restricted role 'X'. Only superadmin can assign this role."
- **Cross-Organization**: "Cannot assign role 'X' from another organization."
- **Global Role**: "Cannot assign global role 'X'. Only superadmin can assign global roles."
- **Create Resource**: "Only superadmin can create roles. Organizations can only assign existing roles to users."

## Security Considerations

1. **Database Level**: Unique constraints ensure roles/permissions are organization-scoped
2. **Application Level**: Validation functions check restrictions before assignment
3. **Audit Level**: All privileged assignments are logged
4. **Middleware Level**: Organization context is validated on every request

## Example Scenarios

### Scenario 1: Organization Adds User
```
Organization: "Maharashtra State"
Action: Add user "john@example.com" with role "manager"
Result: ✅ Success (manager is assignable, not restricted)
Audit: ✅ Logged (manager is privileged role)
```

### Scenario 2: Organization Tries to Assign Superadmin
```
Organization: "Maharashtra State"
Action: Assign role "superadmin" to user
Result: ❌ Error: "Cannot assign restricted role 'superadmin'..."
```

### Scenario 3: Organization Tries to Create Role
```
Organization: "Maharashtra State"
Action: Create new role "custom-admin"
Result: ❌ Error: "Only superadmin can create roles..."
```

### Scenario 4: Superadmin Creates Role
```
User: Superadmin
Action: Create role "state-admin" for "Maharashtra State"
Result: ✅ Success
Organization: Can now assign this role to users
```

## Best Practices

1. **Role Design**: Superadmin should create organization-specific roles that organizations can assign
2. **Permission Design**: Create granular permissions that organizations can combine
3. **Audit Trail**: Always audit privileged role assignments
4. **Validation**: Always validate before assignment, not just at UI level
5. **Error Messages**: Provide clear, actionable error messages

## Migration Notes

When migrating existing data:

1. All existing roles/permissions should be assigned to a default organization
2. Superadmin role should remain global (organizationId = null)
3. Organizations can immediately start assigning existing roles
4. Superadmin can create new roles for organizations as needed

