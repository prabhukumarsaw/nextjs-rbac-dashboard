import { getCurrentUser } from "@/lib/auth/jwt";
import { checkPermission } from "@/lib/auth/permissions";
import { getBlogById } from "@/lib/actions/blogs";
import { redirect, notFound } from "next/navigation";
import { EditBlogForm } from "@/components/blogs/edit-blog-form";

/**
 * Edit Blog Page
 */
export default async function EditBlogPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const blogResult = await getBlogById(params.id);

  if (!blogResult.success || !blogResult.blog) {
    notFound();
  }

  // Check if user is the author or has update permission
  const isAuthor = blogResult.blog.authorId === user.userId;
  const hasUpdatePermission = await checkPermission("blog.update");

  if (!isAuthor && !hasUpdatePermission) {
    redirect("/dashboard/blogs");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Blog</h1>
        <p className="text-muted-foreground mt-2">
          Update your blog post
        </p>
      </div>

      <EditBlogForm blog={blogResult.blog} />
    </div>
  );
}

