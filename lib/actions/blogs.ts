"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/jwt";
import { hasPermission } from "@/lib/auth/permissions";
import { createAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Blog Management Server Actions
 * Handles CRUD operations for user-specific blogs
 */

const createBlogSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  content: z.string().min(1, "Content is required"),
  excerpt: z.string().optional(),
  coverImage: z.string().url().optional().or(z.literal("")),
  isPublished: z.boolean().default(false),
});

const updateBlogSchema = z.object({
  id: z.string(),
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  excerpt: z.string().optional(),
  coverImage: z.string().url().optional().or(z.literal("")),
  isPublished: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

/**
 * Generate slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Create a new blog post
 * Only the creator can create blogs (or users with blog.create permission)
 */
export async function createBlog(data: z.infer<typeof createBlogSchema>) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user has blog.create permission OR is creating their own blog
    const hasAccess = await hasPermission(currentUser.userId, "blog.create");
    if (!hasAccess) {
      return {
        success: false,
        error: "You don't have permission to create blogs",
      };
    }

    const validated = createBlogSchema.parse(data);
    
    // Generate slug if not provided
    const slug = validated.slug || generateSlug(validated.title);

    // Check if slug already exists
    const existingSlug = await prisma.blog.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      return { success: false, error: "A blog with this slug already exists" };
    }

    // Create blog (always assigned to current user)
    const blog = await prisma.blog.create({
      data: {
        title: validated.title,
        slug,
        content: validated.content,
        excerpt: validated.excerpt,
        coverImage: validated.coverImage || null,
        isPublished: validated.isPublished,
        authorId: currentUser.userId,
        publishedAt: validated.isPublished ? new Date() : null,
      },
    });

    await createAuditLog({
      action: "CREATE_BLOG",
      resource: "Blog",
      resourceId: blog.id,
      description: `User ${currentUser.email} created blog: ${blog.title}`,
    });

    revalidatePath("/dashboard/blogs");

    return { success: true, blog };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Create blog error:", error);
    return { success: false, error: "Failed to create blog" };
  }
}

/**
 * Update a blog post
 * Only the author or users with blog.update permission can update
 */
export async function updateBlog(data: z.infer<typeof updateBlogSchema>) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const validated = updateBlogSchema.parse(data);

    // Get existing blog
    const existingBlog = await prisma.blog.findUnique({
      where: { id: validated.id },
    });

    if (!existingBlog) {
      return { success: false, error: "Blog not found" };
    }

    // Check if user is the author OR has blog.update permission
    const isAuthor = existingBlog.authorId === currentUser.userId;
    const hasUpdatePermission = await hasPermission(currentUser.userId, "blog.update");

    if (!isAuthor && !hasUpdatePermission) {
      return {
        success: false,
        error: "You don't have permission to update this blog",
      };
    }

    // Check slug uniqueness if changing
    if (validated.slug && validated.slug !== existingBlog.slug) {
      const slugExists = await prisma.blog.findUnique({
        where: { slug: validated.slug },
      });
      if (slugExists) {
        return { success: false, error: "A blog with this slug already exists" };
      }
    }

    const updateData: any = {};
    if (validated.title) updateData.title = validated.title;
    if (validated.slug) updateData.slug = validated.slug;
    if (validated.content) updateData.content = validated.content;
    if (validated.excerpt !== undefined) updateData.excerpt = validated.excerpt;
    if (validated.coverImage !== undefined) {
      updateData.coverImage = validated.coverImage || null;
    }
    if (validated.isPublished !== undefined) {
      updateData.isPublished = validated.isPublished;
      if (validated.isPublished && !existingBlog.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }
    if (validated.isActive !== undefined) updateData.isActive = validated.isActive;

    const blog = await prisma.blog.update({
      where: { id: validated.id },
      data: updateData,
    });

    await createAuditLog({
      action: "UPDATE_BLOG",
      resource: "Blog",
      resourceId: blog.id,
      description: `User ${currentUser.email} updated blog: ${blog.title}`,
    });

    revalidatePath("/dashboard/blogs");

    return { success: true, blog };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Update blog error:", error);
    return { success: false, error: "Failed to update blog" };
  }
}

/**
 * Delete a blog post
 * Only the author or users with blog.delete permission can delete
 */
export async function deleteBlog(blogId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const blog = await prisma.blog.findUnique({
      where: { id: blogId },
    });

    if (!blog) {
      return { success: false, error: "Blog not found" };
    }

    // Check if user is the author OR has blog.delete permission
    const isAuthor = blog.authorId === currentUser.userId;
    const hasDeletePermission = await hasPermission(currentUser.userId, "blog.delete");

    if (!isAuthor && !hasDeletePermission) {
      return {
        success: false,
        error: "You don't have permission to delete this blog",
      };
    }

    await prisma.blog.delete({
      where: { id: blogId },
    });

    await createAuditLog({
      action: "DELETE_BLOG",
      resource: "Blog",
      resourceId: blogId,
      description: `User ${currentUser.email} deleted blog: ${blog.title}`,
    });

    revalidatePath("/dashboard/blogs");

    return { success: true };
  } catch (error) {
    console.error("Delete blog error:", error);
    return { success: false, error: "Failed to delete blog" };
  }
}

/**
 * Get user's own blogs
 * Users can only see their own blogs (unless they have blog.read.all permission)
 */
export async function getUserBlogs(page: number = 1, limit: number = 10, search?: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const hasReadAllPermission = await hasPermission(currentUser.userId, "blog.read.all");
    const skip = (page - 1) * limit;
    const where: any = {};

    // If user has read.all permission, they can see all blogs
    // Otherwise, only their own blogs
    if (!hasReadAllPermission) {
      where.authorId = currentUser.userId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        { excerpt: { contains: search, mode: "insensitive" } },
      ];
    }

    const [blogs, total] = await Promise.all([
      prisma.blog.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.blog.count({ where }),
    ]);

    return {
      success: true,
      blogs: blogs.map((blog) => ({
        id: blog.id,
        title: blog.title,
        slug: blog.slug,
        content: blog.content,
        excerpt: blog.excerpt,
        coverImage: blog.coverImage,
        isPublished: blog.isPublished,
        isActive: blog.isActive,
        views: blog.views,
        author: blog.author,
        authorId: blog.authorId,
        createdAt: blog.createdAt,
        updatedAt: blog.updatedAt,
        publishedAt: blog.publishedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("Get blogs error:", error);
    return { success: false, error: "Failed to fetch blogs" };
  }
}

/**
 * Get single blog by ID
 * Users can only view their own blogs (unless they have blog.read.all permission)
 */
export async function getBlogById(blogId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized" };
    }

    const blog = await prisma.blog.findUnique({
      where: { id: blogId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!blog) {
      return { success: false, error: "Blog not found" };
    }

    // Check if user is the author OR has blog.read.all permission
    const isAuthor = blog.authorId === currentUser.userId;
    const hasReadAllPermission = await hasPermission(currentUser.userId, "blog.read.all");

    if (!isAuthor && !hasReadAllPermission) {
      return {
        success: false,
        error: "You don't have permission to view this blog",
      };
    }

    return {
      success: true,
      blog: {
        id: blog.id,
        title: blog.title,
        slug: blog.slug,
        content: blog.content,
        excerpt: blog.excerpt,
        coverImage: blog.coverImage,
        isPublished: blog.isPublished,
        isActive: blog.isActive,
        views: blog.views,
        author: blog.author,
        authorId: blog.authorId,
        createdAt: blog.createdAt,
        updatedAt: blog.updatedAt,
        publishedAt: blog.publishedAt,
      },
    };
  } catch (error) {
    console.error("Get blog error:", error);
    return { success: false, error: "Failed to fetch blog" };
  }
}

