# Enterprise Dashboard

A comprehensive enterprise dashboard platform built with Next.js, featuring user management, role-based access control (RBAC), permission management, and audit logging.

## Features

- 🔐 **JWT Authentication** - Secure token-based authentication with HTTP-only cookies
- 👥 **User Management** - Create, update, and manage system users
- 🛡️ **Role Management** - Define and configure user roles
- 🔑 **Permission Management** - Granular permission system for fine-grained access control
- 📋 **Menu-Based Permissions** - Control access to navigation menus based on roles
- 📊 **Audit Logging** - Comprehensive activity tracking for compliance and security
- 👑 **Superadmin Role** - Special role with full system access
- 🎨 **Modern UI** - Built with shadcn/ui and Tailwind CSS
- ⚡ **Optimized Performance** - SSR and ISR optimizations for fast page loads
- 🏗️ **Clean Architecture** - Well-organized code structure with separated concerns

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Validation**: Zod
- **Forms**: React Hook Form

## Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd own-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/dashboard_db?schema=public"

   # JWT Secret
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
   JWT_EXPIRES_IN="7d"

   # NextAuth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-nextauth-secret-change-this-in-production"

   # Google OAuth (optional)
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"

   # WhatsApp OAuth (optional)
   WHATSAPP_CLIENT_ID="your-whatsapp-client-id"
   WHATSAPP_CLIENT_SECRET="your-whatsapp-client-secret"

   # Default Admin Credentials (change after first login)
   DEFAULT_ADMIN_EMAIL="admin@example.com"
   DEFAULT_ADMIN_USERNAME="admin"
   DEFAULT_ADMIN_PASSWORD="Admin@123"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate

   # Push schema to database
   npm run db:push

   # Seed the database with default data
   npm run db:seed
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Default Login Credentials

After seeding the database, you can login with:

- **Email**: `admin@example.com` (or your `DEFAULT_ADMIN_EMAIL`)
- **Username**: `admin` (or your `DEFAULT_ADMIN_USERNAME`)
- **Password**: `Admin@123` (or your `DEFAULT_ADMIN_PASSWORD`)

⚠️ **Important**: Change the default password immediately after first login!

## Project Structure

```
own-dashboard/
├── app/                    # Next.js app directory
│   ├── dashboard/         # Dashboard pages
│   ├── login/             # Login page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── dashboard/        # Dashboard-specific components
│   ├── users/            # User management components
│   ├── roles/            # Role management components
│   ├── permissions/      # Permission management components
│   └── logs/             # Audit log components
├── lib/                  # Utility libraries
│   ├── actions/          # Server actions
│   ├── auth/             # Authentication utilities
│   ├── prisma.ts         # Prisma client
│   └── utils.ts          # Utility functions
├── prisma/               # Prisma configuration
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Database seed script
├── middleware.ts         # Next.js middleware for route protection
└── package.json          # Dependencies
```

## Key Features Explained

### User Management
- Create users with email and username
- Assign roles and permissions
- Activate/deactivate users
- Track last login times
- Default password generation for new users

### Role Management
- Create custom roles
- Assign permissions to roles
- Assign menu access to roles
- Superadmin role has all access automatically

### Permission System
- Granular permissions (resource.action format)
- Examples: `user.create`, `user.read`, `role.update`, etc.
- Permissions grouped by resource
- Role-based permission assignment

### Menu Permissions
- Control which menus users can see
- Based on role assignments
- Superadmin sees all menus

### Audit Logging
- Tracks all user actions
- Records IP addresses and user agents
- Searchable and filterable
- Essential for compliance

## Database Schema

The application uses the following main models:

- **User**: Stores user information
- **Role**: Defines user roles
- **Permission**: Granular permissions
- **Menu**: Navigation menu items
- **UserRole**: Many-to-many relationship between users and roles
- **RolePermission**: Many-to-many relationship between roles and permissions
- **RoleMenu**: Many-to-many relationship between roles and menus
- **AuditLog**: System activity logs

## API Routes & Server Actions

All data operations use Next.js Server Actions for type-safe, server-side operations:

- `lib/actions/auth.ts` - Authentication actions
- `lib/actions/users.ts` - User management actions
- `lib/actions/roles.ts` - Role management actions
- `lib/actions/permissions.ts` - Permission management actions

## Security Features

- JWT tokens stored in HTTP-only cookies
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Permission-based route protection
- Audit logging for all actions
- Middleware-based route protection

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run database migrations
npm run db:migrate

# Open Prisma Studio (database GUI)
npm run db:studio

# Seed database
npm run db:seed
```

## Production Deployment

1. Set up a PostgreSQL database
2. Configure environment variables
3. Run database migrations: `npm run db:migrate`
4. Seed the database: `npm run db:seed`
5. Build the application: `npm run build`
6. Start the server: `npm start`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue on the GitHub repository.
