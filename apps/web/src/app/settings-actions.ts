"use server";

import { DataError, getCtx, updateProfile } from "@golink/data";
import { revalidatePath } from "next/cache";

export interface SettingActionResult {
  ok: boolean;
  error?: string;
}

export async function updateProfileAction(patch: {
  displayName?: string;
  timezone?: string;
}): Promise<SettingActionResult> {
  try {
    await updateProfile(await getCtx(), patch);
    revalidatePath("/settings");
    return { ok: true };
  } catch (error) {
    if (error instanceof DataError) return { ok: false, error: error.message };
    return { ok: false, error: "Those changes could not be saved." };
  }
}
