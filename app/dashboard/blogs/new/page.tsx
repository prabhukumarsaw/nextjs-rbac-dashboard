import { getCurrentUser } from "@/lib/auth/jwt";
import { checkPermission } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { CreateBlogForm } from "@/components/blogs/create-blog-form";

/**
 * Create Blog Page
 */
export default async function CreateBlogPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const hasAccess = await checkPermission("blog.create");
  if (!hasAccess) {
    redirect("/dashboard/blogs");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create New Blog</h1>
        <p className="text-muted-foreground mt-2">
          Write and publish your blog post
        </p>
      </div>

      <CreateBlogForm />
    </div>
  );
}

