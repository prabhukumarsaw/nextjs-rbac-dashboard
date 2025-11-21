# Multi-Organization Migration Guide

This guide explains how to migrate your existing single-tenant application to support multiple organizations without breaking existing functionality.

## Overview

The multi-organization layer has been added as a new isolation layer. Key features:

- **Organizations**: Each organization is a separate tenant with isolated data
- **Users**: Users can belong to multiple organizations
- **Roles & Permissions**: Scoped per organization (with global superadmin support)
- **Menus**: Organization-specific menu structures
- **Superadmin**: Global superadmin role bypasses organization restrictions

## Database Migration Steps

### 1. Generate and Run Migration

```bash
# Generate Prisma client with new schema
npm run db:generate

# Create migration
npm run db:migrate

# Or push schema directly (for development)
npm run db:push
```

### 2. Migrate Existing Data

After running the migration, you need to migrate existing data to a default organization:

```typescript
// Create a migration script: prisma/migrate-to-organizations.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateToOrganizations() {
  // 1. Create default organization
  const defaultOrg = await prisma.organization.upsert({
    where: { slug: "default" },
    update: {},
    create: {
      name: "Default Organization",
      slug: "default",
      description: "Default organization for existing data",
      isActive: true,
    },
  });

  // 2. Migrate all users to default organization
  const users = await prisma.user.findMany();
  for (const user of users) {
    await prisma.userOrganization.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: defaultOrg.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        organizationId: defaultOrg.id,
        isActive: true,
      },
    });
  }

  // 3. Migrate roles to default organization (except superadmin)
  const roles = await prisma.role.findMany({
    where: { organizationId: null },
  });
  for (const role of roles) {
    if (role.slug !== "superadmin") {
      await prisma.role.update({
        where: { id: role.id },
        data: { organizationId: defaultOrg.id },
      });
    }
    // Update UserRole organizationId
    await prisma.userRole.updateMany({
      where: { roleId: role.id },
      data: { organizationId: role.organizationId || defaultOrg.id },
    });
  }

  // 4. Migrate permissions to default organization
  const permissions = await prisma.permission.findMany({
    where: { organizationId: null },
  });
  for (const permission of permissions) {
    await prisma.permission.update({
      where: { id: permission.id },
      data: { organizationId: defaultOrg.id },
    });
  }

  // 5. Migrate menus to default organization
  const menus = await prisma.menu.findMany({
    where: { organizationId: null },
  });
  for (const menu of menus) {
    await prisma.menu.update({
      where: { id: menu.id },
      data: { organizationId: defaultOrg.id },
    });
  }

  // 6. Migrate blogs to default organization
  const blogs = await prisma.blog.findMany({
    where: { organizationId: null },
  });
  for (const blog of blogs) {
    await prisma.blog.update({
      where: { id: blog.id },
      data: { organizationId: defaultOrg.id },
    });
  }

  // 7. Migrate audit logs to default organization
  await prisma.auditLog.updateMany({
    where: { organizationId: null },
    data: { organizationId: defaultOrg.id },
  });

  console.log("Migration completed successfully!");
}

migrateToOrganizations()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run the migration script:
```bash
tsx prisma/migrate-to-organizations.ts
```

## Code Updates Required

### 1. Update Permission Checks

Update permission checking functions to consider organization context:

```typescript
// lib/auth/permissions.ts
import { getCurrentOrganizationId, buildOrganizationFilter } from "@/lib/organization/context";

export async function hasPermission(
  userId: string,
  permissionSlug: string,
  organizationId?: string
): Promise<boolean> {
  // Superadmin check (global role)
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  const isSuperadmin = userRoles.some(
    (ur) => ur.role.slug === SUPERADMIN_ROLE && ur.role.organizationId === null
  );

  if (isSuperadmin) return true;

  // Get organization context
  const orgId = organizationId || await getCurrentOrganizationId();
  if (!orgId) return false;

  // Check permission in organization context
  const orgFilter = await buildOrganizationFilter(true);
  
  // Query with organization filter
  // ... (update query logic)
}
```

### 2. Update Server Actions

Add organization context to all server actions:

```typescript
// lib/actions/users.ts
import { getCurrentOrganizationId, buildOrganizationFilter } from "@/lib/organization/context";

export async function getUsers(page: number = 1, limit: number = 10, search?: string) {
  // ... existing code ...
  
  const orgId = await getCurrentOrganizationId();
  const orgFilter = await buildOrganizationFilter(false);
  
  const where: any = {
    ...orgFilter,
    organizations: {
      some: {
        organizationId: orgId,
        isActive: true,
      },
    },
  };
  
  // ... rest of query
}
```

### 3. Update Queries to Include Organization Filter

All Prisma queries should filter by organization:

```typescript
// Example: Get roles
const orgFilter = await buildOrganizationFilter(true);
const roles = await prisma.role.findMany({
  where: {
    ...orgFilter,
    isActive: true,
  },
});
```

### 4. Add Organization Switcher Component

Create a component to switch between organizations:

```typescript
// components/organization-switcher.tsx
"use client";

import { useState } from "react";
import { setCurrentOrganizationId } from "@/lib/organization/context";
import { useRouter } from "next/navigation";

export function OrganizationSwitcher({ organizations, currentOrgId }) {
  const router = useRouter();
  
  const handleSwitch = async (orgId: string) => {
    await setCurrentOrganizationId(orgId);
    router.refresh();
  };
  
  // ... UI implementation
}
```

## Backward Compatibility

The system maintains backward compatibility:

1. **Existing Users**: Automatically assigned to "default" organization
2. **Existing Roles**: Migrated to default organization (except superadmin)
3. **Existing Data**: All data scoped to default organization
4. **Superadmin**: Global role that bypasses organization restrictions

## Testing Checklist

- [ ] Run database migration
- [ ] Migrate existing data to default organization
- [ ] Test user login (should work as before)
- [ ] Test permission checks (should work with organization context)
- [ ] Test creating new organization
- [ ] Test switching between organizations
- [ ] Test superadmin access (should see all organizations)
- [ ] Test regular user access (should see only their organizations)
- [ ] Test role/permission assignment per organization
- [ ] Test audit logging with organization context

## Key Concepts

### Organization Isolation

- Each organization has isolated:
  - Users (via UserOrganization junction)
  - Roles (organizationId field)
  - Permissions (organizationId field)
  - Menus (organizationId field)
  - Blogs (organizationId field)
  - Audit Logs (organizationId field)

### Global vs Organization-Specific

- **Global Resources** (organizationId = null):
  - Superadmin role
  - System-wide permissions (optional)
  - Global menus (optional)

- **Organization-Specific Resources**:
  - All other roles, permissions, menus
  - Organization users
  - Organization blogs

### Superadmin Access

Superadmin role (with organizationId = null) has:
- Access to all organizations
- Ability to create/manage organizations
- Bypass organization filters in queries

## Next Steps

1. Run the migration
2. Update server actions to use organization context
3. Add organization switcher UI
4. Test thoroughly
5. Deploy to production

## Support

For issues or questions, refer to the main documentation or create an issue in the repository.

