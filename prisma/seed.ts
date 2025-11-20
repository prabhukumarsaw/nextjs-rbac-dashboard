import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Database Seed Script
 * Initializes the database with default roles, permissions, menus, and superadmin user
 */
async function main() {
  console.log("🌱 Seeding database...");

  // Create default permissions
  const permissions = [
    // User permissions
    { name: "Create User", slug: "user.create", resource: "user", action: "create" },
    { name: "Read User", slug: "user.read", resource: "user", action: "read" },
    { name: "Update User", slug: "user.update", resource: "user", action: "update" },
    { name: "Delete User", slug: "user.delete", resource: "user", action: "delete" },
    // Role permissions
    { name: "Create Role", slug: "role.create", resource: "role", action: "create" },
    { name: "Read Role", slug: "role.read", resource: "role", action: "read" },
    { name: "Update Role", slug: "role.update", resource: "role", action: "update" },
    { name: "Delete Role", slug: "role.delete", resource: "role", action: "delete" },
    // Permission permissions
    { name: "Create Permission", slug: "permission.create", resource: "permission", action: "create" },
    { name: "Read Permission", slug: "permission.read", resource: "permission", action: "read" },
    { name: "Update Permission", slug: "permission.update", resource: "permission", action: "update" },
    { name: "Delete Permission", slug: "permission.delete", resource: "permission", action: "delete" },
    // Audit log permissions
    { name: "Read Audit Log", slug: "audit.read", resource: "audit", action: "read" },
    // Blog permissions
    { name: "Create Blog", slug: "blog.create", resource: "blog", action: "create" },
    { name: "Read Own Blog", slug: "blog.read", resource: "blog", action: "read" },
    { name: "Read All Blogs", slug: "blog.read.all", resource: "blog", action: "read.all" },
    { name: "Update Blog", slug: "blog.update", resource: "blog", action: "update" },
    { name: "Delete Blog", slug: "blog.delete", resource: "blog", action: "delete" },
  ];

  console.log("📝 Creating permissions...");
  const createdPermissions = [];
  for (const perm of permissions) {
    const existing = await prisma.permission.findUnique({
      where: { slug: perm.slug },
    });
    if (!existing) {
      const created = await prisma.permission.create({
        data: perm,
      });
      createdPermissions.push(created);
      console.log(`  ✓ Created permission: ${perm.slug}`);
    } else {
      createdPermissions.push(existing);
      console.log(`  - Permission already exists: ${perm.slug}`);
    }
  }

  // Create default menus
  console.log("📋 Creating menus...");
  const menus = [
    { name: "Dashboard", slug: "dashboard", path: "/dashboard", icon: "dashboard", order: 1 },
    { name: "My Blogs", slug: "blogs", path: "/dashboard/blogs", icon: "blogs", order: 2 },
    { name: "Profile", slug: "profile", path: "/dashboard/profile", icon: "profile", order: 3 },
    { name: "Users", slug: "users", path: "/dashboard/users", icon: "users", order: 4 },
    { name: "Roles", slug: "roles", path: "/dashboard/roles", icon: "roles", order: 5 },
    { name: "Permissions", slug: "permissions", path: "/dashboard/permissions", icon: "permissions", order: 6 },
    { name: "Audit Logs", slug: "logs", path: "/dashboard/logs", icon: "logs", order: 7 },
  ];

  const createdMenus = [];
  for (const menu of menus) {
    const existing = await prisma.menu.findUnique({
      where: { slug: menu.slug },
    });
    if (!existing) {
      const created = await prisma.menu.create({
        data: menu,
      });
      createdMenus.push(created);
      console.log(`  ✓ Created menu: ${menu.name}`);
    } else {
      createdMenus.push(existing);
      console.log(`  - Menu already exists: ${menu.name}`);
    }
  }

  // Create superadmin role
  console.log("👑 Creating superadmin role...");
  let superadminRole = await prisma.role.findUnique({
    where: { slug: "superadmin" },
  });

  if (!superadminRole) {
    superadminRole = await prisma.role.create({
      data: {
        name: "Super Admin",
        slug: "superadmin",
        description: "Super administrator with full system access",
        isActive: true,
      },
    });
    console.log("  ✓ Created superadmin role");
  } else {
    console.log("  - Superadmin role already exists");
  }

  // Assign all permissions and menus to superadmin
  await prisma.rolePermission.deleteMany({
    where: { roleId: superadminRole.id },
  });
  await prisma.roleMenu.deleteMany({
    where: { roleId: superadminRole.id },
  });

  await prisma.rolePermission.createMany({
    data: createdPermissions.map((perm) => ({
      roleId: superadminRole!.id,
      permissionId: perm.id,
    })),
    skipDuplicates: true,
  });

  await prisma.roleMenu.createMany({
    data: createdMenus.map((menu) => ({
      roleId: superadminRole!.id,
      menuId: menu.id,
    })),
    skipDuplicates: true,
  });

  console.log("  ✓ Assigned all permissions and menus to superadmin");

  // Create citizen role
  console.log("👤 Creating citizen role...");
  let citizenRole = await prisma.role.findUnique({
    where: { slug: "citizen" },
  });

  if (!citizenRole) {
    citizenRole = await prisma.role.create({
      data: {
        name: "Citizen",
        slug: "citizen",
        description: "Default role for registered users",
        isActive: true,
      },
    });
    console.log("  ✓ Created citizen role");
  } else {
    console.log("  - Citizen role already exists");
  }

  // Assign blog permissions to citizen role
  const blogPermissions = createdPermissions.filter(
    (p) => p.slug.startsWith("blog.")
  );
  
  await prisma.rolePermission.deleteMany({
    where: { roleId: citizenRole.id },
  });
  await prisma.roleMenu.deleteMany({
    where: { roleId: citizenRole.id },
  });

  // Citizen can create and manage their own blogs
  const citizenBlogPerms = blogPermissions.filter(
    (p) => p.slug === "blog.create" || p.slug === "blog.read" || p.slug === "blog.update" || p.slug === "blog.delete"
  );

  await prisma.rolePermission.createMany({
    data: citizenBlogPerms.map((perm) => ({
      roleId: citizenRole!.id,
      permissionId: perm.id,
    })),
    skipDuplicates: true,
  });

  // Assign blogs and profile menus to citizen
  const citizenMenus = createdMenus.filter(
    (m) => m.slug === "blogs" || m.slug === "profile" || m.slug === "dashboard"
  );

  await prisma.roleMenu.createMany({
    data: citizenMenus.map((menu) => ({
      roleId: citizenRole!.id,
      menuId: menu.id,
    })),
    skipDuplicates: true,
  });

  console.log("  ✓ Assigned blog permissions and menus to citizen role");

  // Create default admin user
  console.log("👤 Creating default admin user...");
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || "admin@example.com";
  const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || "admin";
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "Admin@123";

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        username: adminUsername,
        password: hashedPassword,
        firstName: "Admin",
        lastName: "User",
        isActive: true,
        isEmailVerified: true,
        provider: "credentials",
      },
    });

    // Assign superadmin role
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: superadminRole.id,
      },
    });

    console.log("  ✓ Created admin user");
    console.log(`  📧 Email: ${adminEmail}`);
    console.log(`  👤 Username: ${adminUsername}`);
    console.log(`  🔑 Password: ${adminPassword}`);
    console.log("  ⚠️  Please change the default password after first login!");
  } else {
    console.log("  - Admin user already exists");
  }

  console.log("✅ Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

