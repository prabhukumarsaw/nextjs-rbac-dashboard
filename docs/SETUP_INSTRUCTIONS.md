# Quick Setup Instructions

## Fix Prisma Client Error

The error `Cannot find module '.prisma/client/default'` means Prisma client hasn't been generated. Run:

```bash
npm run db:generate
```

Or manually:
```bash
npx prisma generate
```

## Fix Login Issue

The login password validation was too strict. This has been fixed - login now accepts any password (validation happens server-side during authentication).

## Complete Setup Steps

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Generate Prisma Client**
   ```bash
   npm run db:generate
   ```

3. **Set up database**
   ```bash
   # Create .env file with DATABASE_URL
   npm run db:push
   ```

4. **Seed database**
   ```bash
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## Default Login Credentials

After seeding:
- Email: `admin@example.com`
- Password: `Admin@123`

## All CRUD Pages Created

✅ **Users**
- List: `/dashboard/users`
- Create: `/dashboard/users/new`
- Edit: `/dashboard/users/[id]/edit`
- Delete: From list page

✅ **Roles**
- List: `/dashboard/roles`
- Create: `/dashboard/roles/new`
- Edit: `/dashboard/roles/[id]/edit`
- Delete: From list page

✅ **Permissions**
- List: `/dashboard/permissions`
- Create: `/dashboard/permissions/new`
- Edit: `/dashboard/permissions/[id]/edit`
- Delete: From list page

All pages have:
- Modern, clean UI
- Form validation
- Loading states
- Error handling
- Toast notifications
- Responsive design

