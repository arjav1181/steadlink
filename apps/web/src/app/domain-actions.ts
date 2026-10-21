"use server";

import { addDomain, DataError, getCtx, removeDomain, verifyDomain } from "@golink/data";
import { revalidatePath } from "next/cache";

export interface DomainActionResult {
  ok: boolean;
  error?: string;
  /** What the resolver answered, when the action checked DNS. */
  check?: {
    type: string;
    name: string;
    expected: string;
    found: string | null;
    ok: boolean;
  }[];
  verified?: boolean;
}

export async function addDomainAction(host: string): Promise<DomainActionResult> {
  try {
    await addDomain(await getCtx(), host);
    revalidatePath("/domains");
    return { ok: true };
  } catch (error) {
    if (error instanceof DataError) return { ok: false, error: error.message };
    return { ok: false, error: "That domain could not be added." };
  }
}

export async function verifyDomainAction(domainId: string): Promise<DomainActionResult> {
  try {
    const domain = await verifyDomain(await getCtx(), domainId);
    revalidatePath("/domains");
    return {
      ok: true,
      check: domain.dnsCheck?.checks ?? [],
      verified: domain.dnsCheck?.verified ?? false,
    };
  } catch (error) {
    if (error instanceof DataError) return { ok: false, error: error.message };
    return { ok: false, error: "That domain could not be checked." };
  }
}

export async function removeDomainAction(domainId: string): Promise<DomainActionResult> {
  try {
    await removeDomain(await getCtx(), domainId);
    revalidatePath("/domains");
    return { ok: true };
  } catch (error) {
    if (error instanceof DataError) return { ok: false, error: error.message };
    return { ok: false, error: "That domain could not be removed." };
  }
}
