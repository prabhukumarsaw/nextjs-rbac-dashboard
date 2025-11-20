"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createRole } from "@/lib/actions/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Create Role Form Component
 */

const createRoleSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  slug: z.string().min(1, "Role slug is required"),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).optional(),
  menuIds: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
});

type CreateRoleFormData = z.infer<typeof createRoleSchema>;

interface CreateRoleFormProps {
  permissions: Array<{
    id: string;
    name: string;
    slug: string;
    resource: string;
    action: string;
  }>;
  menus: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}

export function CreateRoleForm({ permissions, menus }: CreateRoleFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CreateRoleFormData>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      isActive: true,
      permissionIds: [],
      menuIds: [],
    },
  });

  const selectedPermissions = watch("permissionIds") || [];
  const selectedMenus = watch("menuIds") || [];

  // Group permissions by resource
  const permissionsByResource = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, typeof permissions>);

  const onSubmit = async (data: CreateRoleFormData) => {
    setLoading(true);
    try {
      const result = await createRole(data);

      if (result.success) {
        toast({
          title: "Role created",
          description: "The role has been successfully created.",
        });
        router.push("/dashboard/roles");
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create role",
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

  const togglePermission = (permissionId: string) => {
    const current = selectedPermissions;
    if (current.includes(permissionId)) {
      setValue("permissionIds", current.filter((id) => id !== permissionId));
    } else {
      setValue("permissionIds", [...current, permissionId]);
    }
  };

  const toggleMenu = (menuId: string) => {
    const current = selectedMenus;
    if (current.includes(menuId)) {
      setValue("menuIds", current.filter((id) => id !== menuId));
    } else {
      setValue("menuIds", [...current, menuId]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Information</CardTitle>
        <CardDescription>Define a new role with permissions and menu access</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name *</Label>
              <Input
                id="name"
                placeholder="Admin"
                {...register("name")}
                disabled={loading}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Role Slug *</Label>
              <Input
                id="slug"
                placeholder="admin"
                {...register("slug")}
                disabled={loading}
              />
              {errors.slug && (
                <p className="text-sm text-destructive">{errors.slug.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Unique identifier (lowercase, no spaces)
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Role description..."
              {...register("description")}
              disabled={loading}
              rows={3}
            />
          </div>

          <Tabs defaultValue="permissions" className="w-full">
            <TabsList>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
              <TabsTrigger value="menus">Menus</TabsTrigger>
            </TabsList>

            <TabsContent value="permissions" className="space-y-4">
              <div className="max-h-96 overflow-y-auto space-y-4 p-4 border rounded-lg">
                {Object.entries(permissionsByResource).map(([resource, perms]) => (
                  <div key={resource} className="space-y-2">
                    <h4 className="font-semibold capitalize">{resource}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {perms.map((perm) => (
                        <div key={perm.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`perm-${perm.id}`}
                            checked={selectedPermissions.includes(perm.id)}
                            onCheckedChange={() => togglePermission(perm.id)}
                            disabled={loading}
                          />
                          <Label
                            htmlFor={`perm-${perm.id}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {perm.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="menus" className="space-y-4">
              <div className="max-h-96 overflow-y-auto space-y-2 p-4 border rounded-lg">
                {menus.map((menu) => (
                  <div key={menu.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`menu-${menu.id}`}
                      checked={selectedMenus.includes(menu.id)}
                      onCheckedChange={() => toggleMenu(menu.id)}
                      disabled={loading}
                    />
                    <Label
                      htmlFor={`menu-${menu.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {menu.name}
                    </Label>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={watch("isActive")}
              onCheckedChange={(checked) => setValue("isActive", checked as boolean)}
              disabled={loading}
            />
            <Label htmlFor="isActive" className="text-sm font-normal cursor-pointer">
              Role is active
            </Label>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Role
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

