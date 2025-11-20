# Module Development Quick Reference

## 🚀 Quick Checklist for Adding New Modules

Use this checklist when adding any new module to the system.

---

## 1️⃣ Database Schema

### Files to Edit:
- `prisma/schema.prisma`

### Steps:
```prisma
// 1. Add model
model YourModule {
  id          String   @id @default(cuid())
  title       String
  // ... your fields ...
  authorId    String   // Always include for user ownership
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  author      User     @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@index([authorId])
  @@map("your_modules")
}

// 2. Add relation to User model
model User {
  // ... existing fields ...
  yourModules YourModule[]  // Add this line
}
```

### Commands:
```bash
npm run db:generate
npm run db:push
```

---

## 2️⃣ Permissions

### Files to Edit:
- `prisma/seed.ts`

### Steps:
```typescript
// 1. Add to permissions array
const permissions = [
  // ... existing ...
  { name: "Create YourModule", slug: "yourmodule.create", resource: "yourmodule", action: "create" },
  { name: "Read Own YourModule", slug: "yourmodule.read", resource: "yourmodule", action: "read" },
  { name: "Read All YourModule", slug: "yourmodule.read.all", resource: "yourmodule", action: "read.all" },
  { name: "Update YourModule", slug: "yourmodule.update", resource: "yourmodule", action: "update" },
  { name: "Delete YourModule", slug: "yourmodule.delete", resource: "yourmodule", action: "delete" },
];

// 2. Assign to roles (after creating citizen role)
const yourModulePerms = createdPermissions.filter(
  (p) => p.slug.startsWith("yourmodule.") && 
         p.slug !== "yourmodule.read.all"
);

await prisma.rolePermission.createMany({
  data: yourModulePerms.map((perm) => ({
    roleId: citizenRole!.id,
    permissionId: perm.id,
  })),
  skipDuplicates: true,
});
```

---

## 3️⃣ Server Actions

### File to Create:
- `lib/actions/yourmodule.ts`

### Required Functions:
```typescript
✅ createYourModule()      // With permission check
✅ updateYourModule()      // With ownership + permission check
✅ deleteYourModule()      // With ownership + permission check
✅ getUserYourModules()    // With isolation logic
✅ getYourModuleById()     // With access check
```

### Permission Check Pattern:
```typescript
// For create
const hasAccess = await hasPermission(currentUser.userId, "yourmodule.create");

// For update/delete
const isAuthor = resource.authorId === currentUser.userId;
const hasPermission = await hasPermission(currentUser.userId, "yourmodule.update");
if (!isAuthor && !hasPermission) {
  return { success: false, error: "No permission" };
}

// For list
const hasReadAll = await hasPermission(currentUser.userId, "yourmodule.read.all");
if (!hasReadAll) {
  where.authorId = currentUser.userId; // Only own resources
}
```

---

## 4️⃣ UI Components

### Files to Create:
- `components/yourmodule/yourmodule-table.tsx`
- `components/yourmodule/create-yourmodule-form.tsx`
- `components/yourmodule/edit-yourmodule-form.tsx`

### Required Features:
- ✅ Form validation (React Hook Form + Zod)
- ✅ Loading states
- ✅ Error handling
- ✅ Toast notifications
- ✅ Responsive design

---

## 5️⃣ Pages

### Files to Create:
- `app/dashboard/yourmodule/page.tsx` (List)
- `app/dashboard/yourmodule/new/page.tsx` (Create)
- `app/dashboard/yourmodule/[id]/edit/page.tsx` (Edit)

### Required Checks:
```typescript
// 1. Authentication check
const user = await getCurrentUser();
if (!user) redirect("/login");

// 2. Permission check
const hasAccess = await checkPermission("yourmodule.read");
if (!hasAccess) redirect("/dashboard");

// 3. Ownership check (for edit)
const isAuthor = resource.authorId === user.userId;
const hasUpdatePermission = await checkPermission("yourmodule.update");
if (!isAuthor && !hasUpdatePermission) redirect("/dashboard/yourmodule");
```

---

## 6️⃣ Menu Integration

### Files to Edit:
- `prisma/seed.ts`
- `components/dashboard/sidebar.tsx`

### Steps:
```typescript
// 1. Add to menus array in seed.ts
const menus = [
  // ... existing ...
  { name: "Your Module", slug: "yourmodule", path: "/dashboard/yourmodule", icon: "yourmodule", order: X },
];

// 2. Add icon to sidebar.tsx
import { YourIcon } from "lucide-react";

const iconMap = {
  // ... existing ...
  yourmodule: YourIcon,
};
```

---

## 7️⃣ Testing Checklist

- [ ] Create resource (as regular user)
- [ ] Update own resource (should work)
- [ ] Update other's resource (should fail without permission)
- [ ] Delete own resource (should work)
- [ ] Delete other's resource (should fail without permission)
- [ ] List shows only own resources
- [ ] Admin can see all resources (with read.all permission)
- [ ] Menu appears for users with access
- [ ] Audit logs are created

---

## 📋 Standard Code Patterns

### Create Function:
```typescript
export async function createYourModule(data: Schema) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Unauthorized" };
  
  const hasAccess = await hasPermission(currentUser.userId, "yourmodule.create");
  if (!hasAccess) return { success: false, error: "No permission" };
  
  const resource = await prisma.yourModule.create({
    data: { ...validated, authorId: currentUser.userId },
  });
  
  await createAuditLog({ action: "CREATE_YOURMODULE", ... });
  revalidatePath("/dashboard/yourmodule");
  return { success: true, resource };
}
```

### Update Function:
```typescript
export async function updateYourModule(data: Schema) {
  const currentUser = await getCurrentUser();
  const existing = await prisma.yourModule.findUnique({ where: { id } });
  
  const isAuthor = existing.authorId === currentUser.userId;
  const hasPermission = await hasPermission(currentUser.userId, "yourmodule.update");
  
  if (!isAuthor && !hasPermission) {
    return { success: false, error: "No permission" };
  }
  
  // Update logic...
}
```

### List Function:
```typescript
export async function getUserYourModules(page, limit, search) {
  const currentUser = await getCurrentUser();
  const hasReadAll = await hasPermission(currentUser.userId, "yourmodule.read.all");
  
  const where: any = {};
  if (!hasReadAll) {
    where.authorId = currentUser.userId; // Isolation
  }
  
  // Query logic...
}
```

---

## 🎯 Permission Logic Summary

| Action | Ownership Check | Permission Check | Result |
|--------|----------------|------------------|--------|
| Create | N/A | `module.create` | ✅ If has permission |
| Read Own | ✅ Is author | `module.read` | ✅ If owner OR has permission |
| Read All | N/A | `module.read.all` | ✅ If has permission |
| Update Own | ✅ Is author | `module.update` | ✅ If owner OR has permission |
| Delete Own | ✅ Is author | `module.delete` | ✅ If owner OR has permission |

**Key Rule**: Ownership always grants access, permissions are for admin override.

---

## 📁 File Structure

```
app/dashboard/[module]/
├── page.tsx                    # List
├── new/page.tsx               # Create
└── [id]/edit/page.tsx         # Edit

components/[module]/
├── [module]-table.tsx
├── create-[module]-form.tsx
└── edit-[module]-form.tsx

lib/actions/
└── [module].ts
```

---

## 🔄 After Adding Module

1. Run seed: `npm run db:seed`
2. Test all CRUD operations
3. Verify permissions work correctly
4. Check audit logs are created
5. Test with different user roles

---

**Follow this checklist and you'll have a complete, production-ready module!** ✅

