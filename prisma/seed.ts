import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Database Seed Script
 * Initializes the database with:
 * - Multiple organizations (multi-tenant)
 * - Global and organization-specific permissions, roles, menus
 * - Users for each organization
 * - Sample blogs
 * - Superadmin user
 */
async function main() {
  console.log("🌱 Seeding database with comprehensive dummy data...");

  // ============================================
  // STEP 1: Create Global Permissions (organizationId = null)
  // ============================================
  console.log("\n📝 Creating global permissions...");
  const globalPermissions = [
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
    // Organization permissions
    { name: "Create Organization", slug: "organization.create", resource: "organization", action: "create" },
    { name: "Read Organization", slug: "organization.read", resource: "organization", action: "read" },
    { name: "Update Organization", slug: "organization.update", resource: "organization", action: "update" },
    { name: "Delete Organization", slug: "organization.delete", resource: "organization", action: "delete" },
    { name: "Manage Organization", slug: "organization.manage", resource: "organization", action: "manage" },
    // Audit log permissions
    { name: "Read Audit Log", slug: "audit.read", resource: "audit", action: "read" },
    // Blog permissions
    { name: "Create Blog", slug: "blog.create", resource: "blog", action: "create" },
    { name: "Read Own Blog", slug: "blog.read", resource: "blog", action: "read" },
    { name: "Read All Blogs", slug: "blog.read.all", resource: "blog", action: "read.all" },
    { name: "Update Blog", slug: "blog.update", resource: "blog", action: "update" },
    { name: "Delete Blog", slug: "blog.delete", resource: "blog", action: "delete" },
  ];

  const createdGlobalPermissions = [];
  for (const perm of globalPermissions) {
    const existing = await prisma.permission.findFirst({
      where: { 
        slug: perm.slug,
        organizationId: null, // Global permission
      },
    });
    if (!existing) {
      const created = await prisma.permission.create({
        data: {
          ...perm,
          organizationId: null, // Global permission
        },
      });
      createdGlobalPermissions.push(created);
      console.log(`  ✓ Created global permission: ${perm.slug}`);
    } else {
      createdGlobalPermissions.push(existing);
      console.log(`  - Global permission already exists: ${perm.slug}`);
    }
  }

  // ============================================
  // STEP 2: Create Global Menus (organizationId = null)
  // ============================================
  console.log("\n📋 Creating global menus...");
  const globalMenus = [
    { name: "Dashboard", slug: "dashboard", path: "/dashboard", icon: "dashboard", order: 1 },
    { name: "My Blogs", slug: "blogs", path: "/dashboard/blogs", icon: "blogs", order: 2 },
    { name: "Profile", slug: "profile", path: "/dashboard/profile", icon: "profile", order: 3 },
    { name: "Users", slug: "users", path: "/dashboard/users", icon: "users", order: 4 },
    { name: "Roles", slug: "roles", path: "/dashboard/roles", icon: "roles", order: 5 },
    { name: "Permissions", slug: "permissions", path: "/dashboard/permissions", icon: "permissions", order: 6 },
    { name: "Organizations", slug: "organizations", path: "/dashboard/organizations", icon: "organizations", order: 7 },
    { name: "Audit Logs", slug: "logs", path: "/dashboard/logs", icon: "logs", order: 8 },
  ];

  const createdGlobalMenus = [];
  for (const menu of globalMenus) {
    const existing = await prisma.menu.findFirst({
      where: { 
        slug: menu.slug,
        organizationId: null, // Global menu
      },
    });
    if (!existing) {
      const created = await prisma.menu.create({
        data: {
          ...menu,
          organizationId: null, // Global menu
        },
      });
      createdGlobalMenus.push(created);
      console.log(`  ✓ Created global menu: ${menu.name}`);
    } else {
      createdGlobalMenus.push(existing);
      console.log(`  - Global menu already exists: ${menu.name}`);
    }
  }

  // ============================================
  // STEP 3: Create Global Superadmin Role (organizationId = null)
  // ============================================
  console.log("\n👑 Creating global superadmin role...");
  let superadminRole = await prisma.role.findFirst({
    where: { 
      slug: "superadmin",
      organizationId: null, // Global role
    },
  });

  if (!superadminRole) {
    superadminRole = await prisma.role.create({
      data: {
        name: "Super Admin",
        slug: "superadmin",
        description: "Super administrator with full system access",
        isActive: true,
        organizationId: null, // Global role
      },
    });
    console.log("  ✓ Created global superadmin role");
  } else {
    console.log("  - Global superadmin role already exists");
  }

  // Assign all global permissions and menus to superadmin
  await prisma.rolePermission.deleteMany({
    where: { roleId: superadminRole.id },
  });
  await prisma.roleMenu.deleteMany({
    where: { roleId: superadminRole.id },
  });

  await prisma.rolePermission.createMany({
    data: createdGlobalPermissions.map((perm) => ({
      roleId: superadminRole!.id,
      permissionId: perm.id,
    })),
    skipDuplicates: true,
  });

  await prisma.roleMenu.createMany({
    data: createdGlobalMenus.map((menu) => ({
      roleId: superadminRole!.id,
      menuId: menu.id,
    })),
    skipDuplicates: true,
  });

  console.log("  ✓ Assigned all global permissions and menus to superadmin");

  // ============================================
  // STEP 4: Create Organizations
  // ============================================
  console.log("\n🏢 Creating organizations...");
  const organizations = [
    {
      name: "Maharashtra State",
      slug: "state-maharashtra",
      description: "Maharashtra State Government Organization",
    },
    {
      name: "Karnataka State",
      slug: "state-karnataka",
      description: "Karnataka State Government Organization",
    },
    {
      name: "Tamil Nadu State",
      slug: "state-tamilnadu",
      description: "Tamil Nadu State Government Organization",
    },
    {
      name: "Default Organization",
      slug: "default",
      description: "Default organization for existing data",
    },
  ];

  const createdOrganizations = [];
  for (const org of organizations) {
    const existing = await prisma.organization.findUnique({
      where: { slug: org.slug },
    });
    if (!existing) {
      const created = await prisma.organization.create({
        data: org,
      });
      createdOrganizations.push(created);
      console.log(`  ✓ Created organization: ${org.name}`);
    } else {
      createdOrganizations.push(existing);
      console.log(`  - Organization already exists: ${org.name}`);
    }
  }

  // ============================================
  // STEP 5: Create Organization-Specific Permissions
  // ============================================
  console.log("\n📝 Creating organization-specific permissions...");
  const orgSpecificPermissions = [
    { name: "Manage State Users", slug: "state.user.manage", resource: "state", action: "user.manage" },
    { name: "View State Reports", slug: "state.reports.view", resource: "state", action: "reports.view" },
    { name: "Manage State Content", slug: "state.content.manage", resource: "state", action: "content.manage" },
  ];

  const createdOrgPermissions: Record<string, any[]> = {};
  for (const org of createdOrganizations) {
    createdOrgPermissions[org.id] = [];
    for (const perm of orgSpecificPermissions) {
      const existing = await prisma.permission.findFirst({
        where: {
          slug: perm.slug,
          organizationId: org.id,
        },
      });
      if (!existing) {
        const created = await prisma.permission.create({
          data: {
            ...perm,
            organizationId: org.id,
          },
        });
        createdOrgPermissions[org.id].push(created);
        console.log(`  ✓ Created permission for ${org.name}: ${perm.slug}`);
      } else {
        createdOrgPermissions[org.id].push(existing);
      }
    }
  }

  // ============================================
  // STEP 6: Create Organization-Specific Roles
  // ============================================
  console.log("\n👥 Creating organization-specific roles...");
  const orgRoles = [
    {
      name: "State Admin",
      slug: "state-admin",
      description: "Administrator for state organization",
    },
    {
      name: "State Manager",
      slug: "state-manager",
      description: "Manager role for state organization",
    },
    {
      name: "State User",
      slug: "state-user",
      description: "Regular user in state organization",
    },
  ];

  const createdOrgRoles: Record<string, any[]> = {};
  for (const org of createdOrganizations) {
    createdOrgRoles[org.id] = [];
    for (const role of orgRoles) {
      const existing = await prisma.role.findFirst({
        where: {
          slug: role.slug,
          organizationId: org.id,
        },
      });
      if (!existing) {
        const created = await prisma.role.create({
          data: {
            ...role,
            organizationId: org.id,
          },
        });
        createdOrgRoles[org.id].push(created);
        console.log(`  ✓ Created role for ${org.name}: ${role.name}`);

        // Assign permissions and menus to roles
        if (role.slug === "state-admin") {
          const stateAdminPerms = [
            ...createdGlobalPermissions.filter((p) =>
              ["user.create", "user.read", "user.update", "role.read", "permission.read", "blog.read", "blog.read.all"].includes(p.slug)
            ),
            ...createdOrgPermissions[org.id],
          ];

          await prisma.rolePermission.createMany({
            data: stateAdminPerms.map((perm) => ({
              roleId: created.id,
              permissionId: perm.id,
            })),
            skipDuplicates: true,
          });

          // Assign menus to state-admin
          const stateAdminMenus = createdGlobalMenus.filter((m) =>
            ["dashboard", "users", "roles", "permissions", "blogs", "profile"].includes(m.slug)
          );
          await prisma.roleMenu.createMany({
            data: stateAdminMenus.map((menu) => ({
              roleId: created.id,
              menuId: menu.id,
            })),
            skipDuplicates: true,
          });
        }

        if (role.slug === "state-manager") {
          const stateManagerPerms = [
            ...createdGlobalPermissions.filter((p) =>
              ["user.read", "blog.read", "blog.read.all"].includes(p.slug)
            ),
            ...createdOrgPermissions[org.id].filter((p) => p.slug === "state.reports.view"),
          ];

          await prisma.rolePermission.createMany({
            data: stateManagerPerms.map((perm) => ({
              roleId: created.id,
              permissionId: perm.id,
            })),
            skipDuplicates: true,
          });

          // Assign menus to state-manager
          const stateManagerMenus = createdGlobalMenus.filter((m) =>
            ["dashboard", "blogs", "profile"].includes(m.slug)
          );
          await prisma.roleMenu.createMany({
            data: stateManagerMenus.map((menu) => ({
              roleId: created.id,
              menuId: menu.id,
            })),
            skipDuplicates: true,
          });
        }

        if (role.slug === "state-user") {
          // Assign basic permissions to state-user
          const stateUserPerms = createdGlobalPermissions.filter((p) =>
            ["blog.create", "blog.read", "blog.update", "blog.delete"].includes(p.slug)
          );

          await prisma.rolePermission.createMany({
            data: stateUserPerms.map((perm) => ({
              roleId: created.id,
              permissionId: perm.id,
            })),
            skipDuplicates: true,
          });

          // Assign menus to state-user
          const stateUserMenus = createdGlobalMenus.filter((m) =>
            ["dashboard", "blogs", "profile"].includes(m.slug)
          );
          await prisma.roleMenu.createMany({
            data: stateUserMenus.map((menu) => ({
              roleId: created.id,
              menuId: menu.id,
            })),
            skipDuplicates: true,
          });
        }
      } else {
        createdOrgRoles[org.id].push(existing);
      }
    }
  }

  // ============================================
  // STEP 7: Create Superadmin User
  // ============================================
  console.log("\n👤 Creating superadmin user...");
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || "admin@example.com";
  const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || "admin";
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "Admin@123";

  let adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!adminUser) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        username: adminUsername,
        password: hashedPassword,
        firstName: "Super",
        lastName: "Admin",
        isActive: true,
        isEmailVerified: true,
        provider: "credentials",
      },
    });

    // Assign superadmin role (global role)
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: superadminRole.id,
        organizationId: null, // Global role
      },
    });

    console.log("  ✓ Created superadmin user");
    console.log(`  📧 Email: ${adminEmail}`);
    console.log(`  👤 Username: ${adminUsername}`);
    console.log(`  🔑 Password: ${adminPassword}`);
    console.log("  ⚠️  Please change the default password after first login!");
  } else {
    console.log("  - Superadmin user already exists");
  }

  // ============================================
  // STEP 8: Create Organization Users
  // ============================================
  console.log("\n👥 Creating organization users...");
  const orgUsers = [
    // Maharashtra State Users
    {
      email: "maharashtra.admin@example.com",
      username: "maha-admin",
      firstName: "Maharashtra",
      lastName: "Admin",
      password: "Admin@123",
      organizationSlug: "state-maharashtra",
      roleSlug: "state-admin",
    },
    {
      email: "maharashtra.manager@example.com",
      username: "maha-manager",
      firstName: "Maharashtra",
      lastName: "Manager",
      password: "Manager@123",
      organizationSlug: "state-maharashtra",
      roleSlug: "state-manager",
    },
    {
      email: "maharashtra.user1@example.com",
      username: "maha-user1",
      firstName: "Raj",
      lastName: "Patil",
      password: "User@123",
      organizationSlug: "state-maharashtra",
      roleSlug: "state-user",
    },
    {
      email: "maharashtra.user2@example.com",
      username: "maha-user2",
      firstName: "Priya",
      lastName: "Sharma",
      password: "User@123",
      organizationSlug: "state-maharashtra",
      roleSlug: "state-user",
    },
    // Karnataka State Users
    {
      email: "karnataka.admin@example.com",
      username: "karnataka-admin",
      firstName: "Karnataka",
      lastName: "Admin",
      password: "Admin@123",
      organizationSlug: "state-karnataka",
      roleSlug: "state-admin",
    },
    {
      email: "karnataka.manager@example.com",
      username: "karnataka-manager",
      firstName: "Karnataka",
      lastName: "Manager",
      password: "Manager@123",
      organizationSlug: "state-karnataka",
      roleSlug: "state-manager",
    },
    {
      email: "karnataka.user1@example.com",
      username: "karnataka-user1",
      firstName: "Kumar",
      lastName: "Rao",
      password: "User@123",
      organizationSlug: "state-karnataka",
      roleSlug: "state-user",
    },
    // Tamil Nadu State Users
    {
      email: "tamilnadu.admin@example.com",
      username: "tn-admin",
      firstName: "Tamil Nadu",
      lastName: "Admin",
      password: "Admin@123",
      organizationSlug: "state-tamilnadu",
      roleSlug: "state-admin",
    },
    {
      email: "tamilnadu.user1@example.com",
      username: "tn-user1",
      firstName: "Lakshmi",
      lastName: "Iyer",
      password: "User@123",
      organizationSlug: "state-tamilnadu",
      roleSlug: "state-user",
    },
  ];

  for (const userData of orgUsers) {
    const org = createdOrganizations.find((o) => o.slug === userData.organizationSlug);
    if (!org) continue;

    const role = createdOrgRoles[org.id]?.find((r) => r.slug === userData.roleSlug);
    if (!role) continue;

    let user = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (!user) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      user = await prisma.user.create({
        data: {
          email: userData.email,
          username: userData.username,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          isActive: true,
          isEmailVerified: true,
          provider: "credentials",
        },
      });
      console.log(`  ✓ Created user: ${userData.email}`);
    } else {
      console.log(`  - User already exists: ${userData.email}`);
    }

    // Add user to organization
    const userOrg = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: org.id,
        },
      },
    });

    if (!userOrg) {
      await prisma.userOrganization.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          isActive: true,
        },
      });
      console.log(`    ✓ Added user to ${org.name}`);
    }

    // Assign role to user in organization
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId: user.id,
        roleId: role.id,
        organizationId: org.id,
      },
    });

    if (!userRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
          organizationId: org.id,
        },
      });
      console.log(`    ✓ Assigned ${role.name} role`);
    }
  }

  // ============================================
  // STEP 9: Create Sample Blogs
  // ============================================
  console.log("\n📝 Creating sample blogs...");
  const sampleBlogs = [
    {
      title: "Maharashtra Development Initiatives",
      slug: "maharashtra-development-initiatives",
      content: "Maharashtra state has launched several new development initiatives...",
      excerpt: "Overview of new development programs in Maharashtra",
      authorEmail: "maharashtra.user1@example.com",
      organizationSlug: "state-maharashtra",
      isPublished: true,
    },
    {
      title: "Karnataka Digital Transformation",
      slug: "karnataka-digital-transformation",
      content: "Karnataka is leading digital transformation efforts...",
      excerpt: "Digital initiatives in Karnataka state",
      authorEmail: "karnataka.user1@example.com",
      organizationSlug: "state-karnataka",
      isPublished: true,
    },
    {
      title: "Tamil Nadu Education Reforms",
      slug: "tamilnadu-education-reforms",
      content: "Tamil Nadu has introduced comprehensive education reforms...",
      excerpt: "New education policies in Tamil Nadu",
      authorEmail: "tamilnadu.user1@example.com",
      organizationSlug: "state-tamilnadu",
      isPublished: false,
    },
  ];

  for (const blogData of sampleBlogs) {
    const org = createdOrganizations.find((o) => o.slug === blogData.organizationSlug);
    if (!org) continue;

    const author = await prisma.user.findUnique({
      where: { email: blogData.authorEmail },
    });
    if (!author) continue;

    const existing = await prisma.blog.findFirst({
      where: {
        slug: blogData.slug,
        organizationId: org.id,
      },
    });

    if (!existing) {
      await prisma.blog.create({
        data: {
          title: blogData.title,
          slug: blogData.slug,
          content: blogData.content,
          excerpt: blogData.excerpt,
          authorId: author.id,
          organizationId: org.id,
          isPublished: blogData.isPublished,
          isActive: true,
          publishedAt: blogData.isPublished ? new Date() : null,
        },
      });
      console.log(`  ✓ Created blog: ${blogData.title} (${org.name})`);
    } else {
      console.log(`  - Blog already exists: ${blogData.title}`);
    }
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log("\n✅ Seeding completed successfully!");
  console.log("\n📊 Summary:");
  console.log(`  - Organizations: ${createdOrganizations.length}`);
  console.log(`  - Global Permissions: ${createdGlobalPermissions.length}`);
  console.log(`  - Global Menus: ${createdGlobalMenus.length}`);
  console.log(`  - Global Roles: 1 (superadmin)`);
  console.log(`  - Organization Roles: ${createdOrganizations.length * orgRoles.length}`);
  console.log(`  - Users: ${orgUsers.length + 1} (including superadmin)`);
  console.log(`  - Sample Blogs: ${sampleBlogs.length}`);
  console.log("\n🔑 Login Credentials:");
  console.log(`  Superadmin: ${adminEmail} / ${adminPassword}`);
  console.log(`  Maharashtra Admin: maharashtra.admin@example.com / Admin@123`);
  console.log(`  Karnataka Admin: karnataka.admin@example.com / Admin@123`);
  console.log(`  Tamil Nadu Admin: tamilnadu.admin@example.com / Admin@123`);
  console.log("\n⚠️  Please change all default passwords after first login!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

