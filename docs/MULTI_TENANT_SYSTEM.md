# Multi-Tenant System - Production Guide

## Overview

This is a production-ready multi-tenant RBAC system where:
- **Organizations** are isolated tenants with their own users, roles, permissions, and data
- **Superadmin** can view all organizations or switch to a specific organization
- **Regular users** can only access their assigned organizations
- **Data isolation** is enforced at database and application levels

## Key Features

### 1. Organization Switching

**Superadmin View:**
- Can select "All Organizations" to see aggregated system-wide stats
- Can select a specific organization to see organization-specific data
- Has full access to all organizations

**Regular User View:**
- Sees only organizations they belong to
- Can switch between their organizations
- Data is automatically filtered by organization context

### 2. Context Management

Organization context is managed via HTTP-only cookie:
- `current-organization-id` - Stores selected organization ID
- Automatically set on login (user's first organization)
- Updated when switching organizations
- Cleared when superadmin selects "All Organizations"

### 3. Data Filtering

All queries automatically respect organization context:

```typescript
// When organization selected: Shows org-specific data
// When "All" selected (superadmin): Shows aggregated data

const stats = await getDashboardStats();
// Returns org-specific or aggregated stats based on context
```

## Architecture

### Folder Structure

```
lib/organization/
├── constants.ts       # Restricted roles/permissions
├── validation.ts      # Validation utilities
├── context.ts         # Organization context management
├── actions.ts         # Organization CRUD
├── users.ts           # Organization user management
├── roles.ts           # Assignable roles/permissions
├── switcher.ts        # Organization switching
└── stats.ts           # Organization-aware statistics
```

### Component Structure

```
components/
├── misc/
│   └── org-switcher.tsx    # Organization switcher UI
└── layout/
    └── app-sidebar.tsx     # Sidebar with org switcher

app/
├── dashboard/
│   └── layout.tsx          # Dashboard layout with org context
└── api/
    └── organization/
        └── switch/
            └── route.ts    # API route for switching
```

## Usage Examples

### 1. Get Dashboard Statistics

```typescript
import { getDashboardStats } from "@/lib/organization/stats";

// In a server component
export default async function DashboardPage() {
  const stats = await getDashboardStats();
  
  // stats.isAllOrganizations = true if superadmin viewing all
  // stats.organizationId = current organization ID
  // stats.organizationName = current organization name
  
  return (
    <div>
      <h1>
        {stats.isAllOrganizations 
          ? "System Overview" 
          : `${stats.organizationName} Dashboard`}
      </h1>
      <StatsCards stats={stats} />
    </div>
  );
}
```

### 2. Get Organization-Specific Users

```typescript
import { getOrganizationUsers } from "@/lib/organization/users";

// Automatically filters by current organization context
const result = await getOrganizationUsers(1, 10, search);
// Returns only users in the current organization
```

### 3. Switch Organization (Client-Side)

The `OrgSwitcher` component handles switching automatically:

```tsx
<OrgSwitcher
  organizations={organizations}
  currentOrganizationId={currentOrgId}
  isSuperadmin={isSuper}
/>
```

### 4. Switch Organization (Server Action)

```typescript
import { switchOrganization } from "@/lib/organization/switcher";

// Switch to specific organization
await switchOrganization(organizationId);

// Switch to "All Organizations" (superadmin only)
await switchOrganization(null);
```

## Data Flow

### Organization Selection Flow

```
1. User clicks organization in switcher
   ↓
2. Client calls /api/organization/switch
   ↓
3. Server validates access
   ↓
4. Sets organization cookie
   ↓
5. Revalidates dashboard paths
   ↓
6. Page refreshes with new context
   ↓
7. All queries use new organization context
```

### Query Filtering Flow

```
1. Component calls data fetching function
   ↓
2. Function gets organization context
   ↓
3. If superadmin + no org: Return aggregated data
   ↓
4. If org selected: Return org-specific data
   ↓
5. Apply organization filters to queries
   ↓
6. Return filtered results
```

## Security

### Access Control

1. **Organization Access**: Users can only access organizations they belong to
2. **Superadmin Override**: Superadmin can access all organizations
3. **Context Validation**: Organization context validated on every request
4. **Cookie Security**: HTTP-only, secure cookies prevent XSS

### Data Isolation

1. **Database Level**: Unique constraints per organization
2. **Application Level**: All queries filtered by organization
3. **API Level**: Access validated before switching
4. **UI Level**: Only accessible organizations shown

## Best Practices

### 1. Always Use Organization Context

```typescript
// ✅ Good: Uses organization context
const users = await getOrganizationUsers();

// ❌ Bad: Direct query without context
const users = await prisma.user.findMany();
```

### 2. Handle "All Organizations" View

```typescript
// ✅ Good: Handles both views
const stats = await getDashboardStats();
if (stats.isAllOrganizations) {
  // Show aggregated data
} else {
  // Show org-specific data
}
```

### 3. Validate Before Switching

```typescript
// ✅ Good: Validates access
const hasAccess = await hasOrganizationAccess(userId, orgId);
if (!hasAccess) {
  return { error: "No access" };
}
```

### 4. Clear Error Messages

```typescript
// ✅ Good: Clear error message
if (!orgId) {
  return { error: "No organization selected" };
}
```

## Testing

### Test Scenarios

1. **Superadmin Views All**
   - Select "All Organizations"
   - Verify aggregated stats shown
   - Verify can access all data

2. **Superadmin Views Specific Org**
   - Select specific organization
   - Verify org-specific data shown
   - Verify can switch back to "All"

3. **Regular User Views Org**
   - User sees only their organizations
   - Can switch between their orgs
   - Cannot see other organizations

4. **Organization Switching**
   - Switch organization
   - Verify data updates
   - Verify context persists

## Performance Considerations

### Caching

- Organization context cached in cookie (30 days)
- Consider caching organization data
- Invalidate cache on organization switch

### Query Optimization

- Use indexes on `organizationId` fields
- Batch queries when possible
- Use Prisma's `include` for related data

### Database

- All organization-related fields indexed
- Composite indexes for unique constraints
- Foreign key indexes for joins

## Troubleshooting

### Issue: Data Not Filtering

**Solution**: Ensure queries use `buildOrganizationFilter()` or organization context

### Issue: Cannot Switch Organization

**Solution**: Check user has access to organization and is authenticated

### Issue: Superadmin Cannot See "All"

**Solution**: Verify superadmin role has `organizationId = null` (global role)

### Issue: Wrong Data Shown

**Solution**: Clear organization cookie and re-select organization

## Migration Checklist

- [ ] Run database migration
- [ ] Migrate existing data to default organization
- [ ] Update all queries to use organization context
- [ ] Test organization switching
- [ ] Test data isolation
- [ ] Test superadmin "All Organizations" view
- [ ] Verify audit logging includes organization context
- [ ] Update UI to show organization context
- [ ] Test with multiple organizations
- [ ] Performance test with large datasets

## Future Enhancements

- Organization hierarchies (parent-child)
- Cross-organization collaboration
- Organization-level settings/configurations
- Bulk operations across organizations
- Organization templates
- Advanced analytics per organization

