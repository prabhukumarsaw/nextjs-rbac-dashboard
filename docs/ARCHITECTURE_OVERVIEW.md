# System Architecture Overview

## 🏗️ Architecture Pattern

This dashboard follows a **clean, modular architecture** with clear separation of concerns.

---

## 📐 Architecture Layers

### 1. **Database Layer** (Prisma)
- **Location**: `prisma/schema.prisma`
- **Purpose**: Data models and relationships
- **Pattern**: One model per entity, relations via foreign keys

### 2. **Data Access Layer** (Server Actions)
- **Location**: `lib/actions/[module].ts`
- **Purpose**: Business logic and data operations
- **Pattern**: Server Actions with permission checks

### 3. **Authentication Layer**
- **Location**: `lib/auth/`
- **Purpose**: JWT handling, permission checking
- **Pattern**: Token-based with role/permission system

### 4. **UI Layer** (Components)
- **Location**: `components/[module]/`
- **Purpose**: Reusable UI components
- **Pattern**: Client components with React Hook Form

### 5. **Presentation Layer** (Pages)
- **Location**: `app/dashboard/[module]/`
- **Purpose**: Page routes and layouts
- **Pattern**: Server Components with SSR

---

## 🔐 Permission System Architecture

### Permission Hierarchy:
```
Superadmin
  └── All permissions (automatic)

Admin Roles
  └── Assigned permissions
      └── Can manage all resources

Regular Users (Citizen)
  └── Basic permissions
      └── Can manage own resources only
```

### Permission Check Flow:
```
1. User Action Request
   ↓
2. Server Action (lib/actions/[module].ts)
   ↓
3. Authentication Check (getCurrentUser())
   ↓
4. Permission Check (hasPermission())
   ↓
5. Ownership Check (isAuthor)
   ↓
6. Execute Operation OR Return Error
```

### Permission Types:
- **Ownership-Based**: User owns resource → Full access
- **Permission-Based**: User has permission → Can manage all
- **Isolation**: User sees only own resources (unless has `.read.all`)

---

## 📦 Module Structure Pattern

Every module follows this structure:

```
Module Name (e.g., Ads, Blogs, Products)
│
├── Database
│   ├── Model in schema.prisma
│   └── Relation to User
│
├── Permissions
│   ├── [module].create
│   ├── [module].read
│   ├── [module].read.all
│   ├── [module].update
│   └── [module].delete
│
├── Server Actions
│   ├── create[Module]()
│   ├── update[Module]()
│   ├── delete[Module]()
│   ├── getUser[Module]s()
│   └── get[Module]ById()
│
├── UI Components
│   ├── [module]-table.tsx
│   ├── create-[module]-form.tsx
│   └── edit-[module]-form.tsx
│
└── Pages
    ├── page.tsx (list)
    ├── new/page.tsx (create)
    └── [id]/edit/page.tsx (edit)
```

---

## 🔄 Data Flow

### Create Flow:
```
User Input → Form Component → Server Action → Permission Check → 
Database Create → Audit Log → Revalidate → Redirect
```

### Update Flow:
```
User Input → Form Component → Server Action → Ownership Check → 
Permission Check → Database Update → Audit Log → Revalidate → Redirect
```

### List Flow:
```
Page Load → Server Component → Server Action → Permission Check → 
Isolation Filter → Database Query → Render Table
```

---

## 🎯 Key Design Patterns

### 1. **Ownership Pattern**
```typescript
// Resource always belongs to creator
authorId: String  // Links to User

// Creator always has access
const isAuthor = resource.authorId === currentUser.userId;
if (isAuthor) {
  // Allow operation
}
```

### 2. **Permission Override Pattern**
```typescript
// Admin can manage all resources
const hasPermission = await hasPermission(userId, "module.update");
if (hasPermission) {
  // Allow operation on any resource
}
```

### 3. **Isolation Pattern**
```typescript
// Users see only their own resources
const hasReadAll = await hasPermission(userId, "module.read.all");
const where: any = {};

if (!hasReadAll) {
  where.authorId = currentUser.userId; // Filter by owner
}
```

### 4. **Audit Pattern**
```typescript
// Every operation is logged
await createAuditLog({
  action: "CREATE_MODULE",
  resource: "Module",
  resourceId: resource.id,
  description: `User ${user.email} created module`,
});
```

---

## 🔒 Security Patterns

### 1. **Authentication**
- JWT tokens in HTTP-only cookies
- Middleware checks on all protected routes
- Token verification on every request

### 2. **Authorization**
- Permission checks in server actions
- Ownership verification
- Role-based access control

### 3. **Input Validation**
- Zod schemas for all inputs
- Server-side validation
- Sanitization of user inputs

### 4. **Error Handling**
- Generic error messages (no sensitive data)
- Structured error logging
- Graceful failure handling

---

## 📊 Database Design Patterns

### 1. **User Ownership**
```prisma
model Resource {
  authorId String
  author   User @relation(fields: [authorId], references: [id])
}
```

### 2. **Soft Delete** (Optional)
```prisma
model Resource {
  isActive Boolean @default(true)
  deletedAt DateTime?
}
```

### 3. **Audit Fields**
```prisma
model Resource {
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 4. **Indexing Strategy**
```prisma
model Resource {
  @@index([authorId])      // For user queries
  @@index([status])        // For filtering
  @@index([createdAt])     // For sorting
}
```

---

## 🎨 UI Component Patterns

### 1. **Form Pattern**
```typescript
// React Hook Form + Zod
const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: {...}
});

// Submit handler
const onSubmit = async (data) => {
  const result = await serverAction(data);
  if (result.success) {
    toast({ title: "Success" });
    router.push("/dashboard/module");
  }
};
```

### 2. **Table Pattern**
```typescript
// Search + Pagination
const [search, setSearch] = useState("");
const handleSearch = (e) => {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  router.push(`/dashboard/module?${params.toString()}`);
};
```

### 3. **Delete Pattern**
```typescript
// Confirmation dialog
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const handleDelete = async () => {
  const result = await deleteResource(id);
  if (result.success) {
    toast({ title: "Deleted" });
    router.refresh();
  }
};
```

---

## 🔄 State Management

### Server State:
- **Next.js Server Components**: Automatic data fetching
- **Server Actions**: Mutations
- **Revalidation**: `revalidatePath()` after mutations

### Client State:
- **React Hook Form**: Form state
- **useState**: UI state (dialogs, loading)
- **useToast**: Notifications

---

## 📝 Code Organization

### File Naming:
- **Server Actions**: `lib/actions/[module].ts`
- **Components**: `components/[module]/[module]-[action].tsx`
- **Pages**: `app/dashboard/[module]/[action]/page.tsx`
- **Types**: Inline with Zod schemas

### Function Naming:
- **Create**: `create[Module]()`
- **Update**: `update[Module]()`
- **Delete**: `delete[Module]()`
- **List**: `getUser[Module]s()`
- **Get One**: `get[Module]ById()`

---

## 🚀 Performance Optimizations

### 1. **Database**
- Indexes on frequently queried fields
- Connection pooling
- Query optimization

### 2. **Next.js**
- Server Components (SSR)
- Incremental Static Regeneration (ISR)
- Code splitting
- Image optimization

### 3. **Caching**
- `revalidatePath()` after mutations
- Next.js automatic caching
- Database query caching (future: Redis)

---

## 🔍 Debugging Guide

### Common Issues:

1. **Permission Denied**
   - Check: Is permission created in seed?
   - Check: Is permission assigned to role?
   - Check: Is user in correct role?

2. **Resource Not Found**
   - Check: Ownership check logic
   - Check: Isolation filter
   - Check: Permission check

3. **Form Validation Errors**
   - Check: Zod schema matches form fields
   - Check: Field names match
   - Check: Required fields

4. **Database Errors**
   - Check: Schema is pushed (`npm run db:push`)
   - Check: Prisma client generated (`npm run db:generate`)
   - Check: Relations are correct

---

## 📚 Best Practices

### ✅ DO:
- Always check permissions in server actions
- Always verify ownership for update/delete
- Always log operations in audit log
- Always validate inputs with Zod
- Always handle errors gracefully
- Always show loading states
- Always provide user feedback

### ❌ DON'T:
- Don't trust client-side validation alone
- Don't expose sensitive error details
- Don't skip permission checks
- Don't forget to revalidate after mutations
- Don't create resources without authorId
- Don't allow users to see other users' resources without permission

---

## 🎓 Learning Path

1. **Start Simple**: Create a basic module (like Ads)
2. **Follow Patterns**: Use existing modules as reference
3. **Test Thoroughly**: Test all permission scenarios
4. **Iterate**: Add features incrementally

---

**This architecture ensures scalability, security, and maintainability!** 🏗️

