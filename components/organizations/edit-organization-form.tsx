"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { updateOrganization } from "@/lib/organization/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

const updateOrganizationSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens")
    .optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

type UpdateOrganizationFormData = z.infer<typeof updateOrganizationSchema> & {
  id: string;
};

interface EditOrganizationFormProps {
  organization: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    isActive: boolean;
  };
}

export function EditOrganizationForm({ organization }: EditOrganizationFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<UpdateOrganizationFormData>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: {
      name: organization.name,
      slug: organization.slug,
      description: organization.description || "",
      isActive: organization.isActive,
    },
  });

  const isActive = watch("isActive");

  const onSubmit = async (data: UpdateOrganizationFormData) => {
    setLoading(true);
    try {
      const result = await updateOrganization({
        id: organization.id,
        ...data,
      });

      if (result.success) {
        toast({
          title: "Organization updated",
          description: "The organization has been successfully updated.",
        });

        setTimeout(() => {
          router.push("/dashboard/organizations");
        }, 1000);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update organization",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Edit Organization</CardTitle>
          <CardDescription>
            Update organization information and settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="e.g., Maharashtra State"
                disabled={loading}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                {...register("slug")}
                placeholder="e.g., state-maharashtra"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier (lowercase, numbers, hyphens only)
              </p>
              {errors.slug && (
                <p className="text-sm text-destructive">{errors.slug.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Brief description of the organization"
                rows={3}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Inactive organizations cannot be accessed
                </p>
              </div>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={(checked) => setValue("isActive", checked)}
                disabled={loading}
              />
            </div>

            <div className="flex items-center gap-4">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Organization
              </Button>
              <Link href="/dashboard/organizations">
                <Button type="button" variant="outline" disabled={loading}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

