# Database Seed Data Guide

## Overview

The seed script creates comprehensive dummy data for testing the multi-tenant RBAC system, including multiple organizations, users, roles, permissions, and sample content.

## What Gets Created

### 1. Global Resources (organizationId = null)

#### Permissions (24 global permissions)
- User management: `user.create`, `user.read`, `user.update`, `user.delete`
- Role management: `role.create`, `role.read`, `role.update`, `role.delete`
- Permission management: `permission.create`, `permission.read`, `permission.update`, `permission.delete`
- Organization management: `organization.create`, `organization.read`, `organization.update`, `organization.delete`, `organization.manage`
- Audit logs: `audit.read`
- Blog management: `blog.create`, `blog.read`, `blog.read.all`, `blog.update`, `blog.delete`

#### Menus (8 global menus)
- Dashboard
- My Blogs
- Profile
- Users
- Roles
- Permissions
- Organizations
- Audit Logs

#### Roles (1 global role)
- **Superadmin** - Full system access with all permissions and menus

### 2. Organizations (4 organizations)

1. **Maharashtra State** (`state-maharashtra`)
   - Description: Maharashtra State Government Organization
   - Users: 4 users (admin, manager, 2 regular users)
   - Roles: 3 organization-specific roles
   - Blogs: 1 sample blog

2. **Karnataka State** (`state-karnataka`)
   - Description: Karnataka State Government Organization
   - Users: 3 users (admin, manager, 1 regular user)
   - Roles: 3 organization-specific roles
   - Blogs: 1 sample blog

3. **Tamil Nadu State** (`state-tamilnadu`)
   - Description: Tamil Nadu State Government Organization
   - Users: 2 users (admin, 1 regular user)
   - Roles: 3 organization-specific roles
   - Blogs: 1 sample blog

4. **Default Organization** (`default`)
   - Description: Default organization for existing data
   - Used for backward compatibility

### 3. Organization-Specific Resources

#### Permissions (3 per organization)
- `state.user.manage` - Manage state users
- `state.reports.view` - View state reports
- `state.content.manage` - Manage state content

#### Roles (3 per organization)
- **State Admin** - Full access within organization
  - Can create/read/update users
  - Can read roles and permissions
  - Can manage state-specific resources
  - Menus: Dashboard, Users, Roles, Permissions, Blogs, Profile

- **State Manager** - Management role
  - Can read users and blogs
  - Can view state reports
  - Menus: Dashboard, Blogs, Profile

- **State User** - Regular user
  - Can create and manage own blogs
  - Menus: Dashboard, Blogs, Profile

### 4. Users (10 users total)

#### Superadmin
- **Email**: `admin@example.com` (or from env)
- **Username**: `admin` (or from env)
- **Password**: `Admin@123` (or from env)
- **Role**: Superadmin (global)
- **Access**: All organizations

#### Maharashtra State Users
1. **Admin**: `maharashtra.admin@example.com` / `Admin@123`
   - Role: State Admin
2. **Manager**: `maharashtra.manager@example.com` / `Manager@123`
   - Role: State Manager
3. **User 1**: `maharashtra.user1@example.com` / `User@123`
   - Role: State User
   - Name: Raj Patil
4. **User 2**: `maharashtra.user2@example.com` / `User@123`
   - Role: State User
   - Name: Priya Sharma

#### Karnataka State Users
1. **Admin**: `karnataka.admin@example.com` / `Admin@123`
   - Role: State Admin
2. **Manager**: `karnataka.manager@example.com` / `Manager@123`
   - Role: State Manager
3. **User 1**: `karnataka.user1@example.com` / `User@123`
   - Role: State User
   - Name: Kumar Rao

#### Tamil Nadu State Users
1. **Admin**: `tamilnadu.admin@example.com` / `Admin@123`
   - Role: State Admin
2. **User 1**: `tamilnadu.user1@example.com` / `User@123`
   - Role: State User
   - Name: Lakshmi Iyer

### 5. Sample Blogs (3 blogs)

1. **Maharashtra Development Initiatives**
   - Author: Raj Patil (maharashtra.user1@example.com)
   - Organization: Maharashtra State
   - Status: Published

2. **Karnataka Digital Transformation**
   - Author: Kumar Rao (karnataka.user1@example.com)
   - Organization: Karnataka State
   - Status: Published

3. **Tamil Nadu Education Reforms**
   - Author: Lakshmi Iyer (tamilnadu.user1@example.com)
   - Organization: Tamil Nadu State
   - Status: Draft (not published)

## Running the Seed

```bash
# Generate Prisma client first
npm run db:generate

# Run the seed script
npm run db:seed
```

## Testing Scenarios

### Scenario 1: Superadmin Login
1. Login as `admin@example.com` / `Admin@123`
2. Should see "All Organizations" option in switcher
3. Can switch to any organization
4. Can create/edit/delete organizations
5. Can create roles, permissions, menus

### Scenario 2: Organization Admin Login
1. Login as `maharashtra.admin@example.com` / `Admin@123`
2. Should see only "Maharashtra State" in switcher
3. Can add users to organization
4. Can assign roles to users (but not create roles)
5. Can see only Maharashtra users

### Scenario 3: Organization Manager Login
1. Login as `maharashtra.manager@example.com` / `Manager@123`
2. Can view users and blogs
3. Cannot add users or assign roles
4. Can view state reports

### Scenario 4: Organization User Login
1. Login as `maharashtra.user1@example.com` / `User@123`
2. Can create and manage own blogs
3. Cannot see other users
4. Limited menu access

## Data Structure

```
Organizations (4)
├── Maharashtra State
│   ├── Users (4)
│   ├── Roles (3: state-admin, state-manager, state-user)
│   ├── Permissions (3 org-specific + global)
│   └── Blogs (1)
├── Karnataka State
│   ├── Users (3)
│   ├── Roles (3)
│   ├── Permissions (3 org-specific + global)
│   └── Blogs (1)
├── Tamil Nadu State
│   ├── Users (2)
│   ├── Roles (3)
│   ├── Permissions (3 org-specific + global)
│   └── Blogs (1)
└── Default Organization
    └── (For backward compatibility)

Global Resources
├── Permissions (24)
├── Menus (8)
└── Roles (1: superadmin)
```

## Security Notes

⚠️ **Important**: All default passwords are weak and should be changed immediately after first login!

- Superadmin password: `Admin@123`
- Organization admin passwords: `Admin@123`
- Manager passwords: `Manager@123`
- User passwords: `User@123`

## Customization

You can customize the seed data by modifying `prisma/seed.ts`:

- Add more organizations
- Add more users per organization
- Create custom roles and permissions
- Add more sample blogs
- Modify role-permission assignments

## Troubleshooting

### Issue: Unique constraint violation
**Solution**: The seed script checks for existing data before creating. If you get unique constraint errors, clear the database and re-seed.

### Issue: Users not appearing in organization
**Solution**: Ensure `UserOrganization` records are created and `isActive: true`.

### Issue: Roles not assignable
**Solution**: Check that roles have `organizationId` set correctly and are not restricted roles.

## Next Steps

After seeding:
1. Login as superadmin
2. Verify all organizations are visible
3. Switch to an organization
4. Verify organization users are visible
5. Test adding a user to organization
6. Test role assignment
7. Verify data isolation between organizations

