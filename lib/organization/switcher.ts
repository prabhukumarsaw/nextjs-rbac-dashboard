"use server";

import { setCurrentOrganizationId, clearCurrentOrganizationId } from "./context";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Server Action for Organization Switching
 * Handles organization context switching with proper validation
 */

/**
 * Switch to a specific organization
 */
export async function switchOrganization(organizationId: string | null) {
  try {
    if (organizationId === null) {
      // Clear organization context (show all data for superadmin)
      await clearCurrentOrganizationId();
    } else {
      // Set organization context
      await setCurrentOrganizationId(organizationId);
    }

    // Revalidate all dashboard paths to refresh data
    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard", "page");
    
    return { success: true };
  } catch (error) {
    console.error("Switch organization error:", error);
    return { success: false, error: "Failed to switch organization" };
  }
}

