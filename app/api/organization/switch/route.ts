import { NextRequest, NextResponse } from "next/server";
import { switchOrganization } from "@/lib/organization/switcher";
import { getCurrentUser } from "@/lib/auth/jwt";
import { isSuperadmin } from "@/lib/organization/validation";
import { hasOrganizationAccess } from "@/lib/organization/context";

/**
 * API Route for Organization Switching
 * Handles organization context switching via API
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { organizationId } = body;

    // If switching to null (all organizations), check if superadmin
    if (organizationId === null) {
      const isSuper = await isSuperadmin();
      if (!isSuper) {
        return NextResponse.json(
          { success: false, error: "Only superadmin can view all organizations" },
          { status: 403 }
        );
      }
    } else {
      // Validate user has access to this organization
      const hasAccess = await hasOrganizationAccess(user.userId, organizationId);
      if (!hasAccess) {
        return NextResponse.json(
          { success: false, error: "You don't have access to this organization" },
          { status: 403 }
        );
      }
    }

    const result = await switchOrganization(organizationId);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Organization switch API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

