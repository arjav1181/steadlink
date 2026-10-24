"use server";

import {
  addBlock,
  addDeeplink,
  bulkUpdateLinks,
  type Ctx,
  changeBackHalf,
  createApiKey,
  createBulkUpload,
  createCampaign,
  createLink,
  createPage,
  createQrCode,
  createQrTemplate,
  createWebhook,
  DataError,
  deleteCampaign,
  deleteLink,
  deletePage,
  deleteQrCode,
  deleteQrTemplate,
  deleteWebhook,
  ForbiddenError,
  getCtx,
  getGroups,
  reorderBlocks,
  replaceRoutingRules,
  revokeApiKey,
  saveAiSettings,
  saveUtmPreset,
  setLinkState,
  setPageStatus,
  updateBlock,
  updateCampaign,
  updateLink,
  updatePage,
  updateQrCode,
  updateWebhook,
  verifyDomain,
} from "@steadlink/data";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { GROUP_COOKIE } from "@/server/session";

import "@/server/session";

export interface ActionResult {
  ok: boolean;
  error?: string;
  code?: string;
  id?: string;
  /** What the DNS resolver answered, when the action checked DNS. */
  check?: {
    type: string;
    name: string;
    expected: string;
    found: string | null;
    ok: boolean;
  }[];
  verified?: boolean;
}

function fail(error: unknown): ActionResult {
  if (error instanceof DataError) return { ok: false, error: error.message, code: error.code };
  // A refusal is a message for a person, not a failure to report. "Something
  // went wrong" tells them nothing about what to do.
  if (error instanceof ForbiddenError) return { ok: false, error: error.message };
  console.error("[steadlink] an action failed", error);
  return { ok: false, error: "Something went wrong. Try again." };
}

async function ctx(): Promise<Ctx> {
  return getCtx();
}

export async function createLinkAction(input: {
  longUrl: string;
  domainId?: string;
  code?: string;
  title?: string;
  tags?: string[];
  createQr?: boolean;
  expiresAt?: string | null;
  utmParams?: Record<string, string>;
}): Promise<ActionResult> {
  try {
    const link = await createLink(await ctx(), input);
    revalidatePath("/links");
    revalidatePath("/dashboard");
    return { ok: true, id: link.id };
  } catch (error) {
    return fail(error);
  }
}

export async function updateLinkAction(
  id: string,
  patch: { title?: string; tags?: string[]; longUrl?: string; expiresAt?: string | null },
): Promise<ActionResult> {
  try {
    await updateLink(await ctx(), id, patch);
    revalidatePath("/links");
    revalidatePath(`/links/${id}`);
    return { ok: true, id };
  } catch (error) {
    return fail(error);
  }
}

export async function changeBackHalfAction(id: string, code: string): Promise<ActionResult> {
  try {
    const link = await changeBackHalf(await ctx(), id, code);
    revalidatePath("/links");
    return { ok: true, id: link.id };
  } catch (error) {
    return fail(error);
  }
}

export async function setLinkStateAction(
  id: string,
  state: "hide" | "show" | "archive" | "restore",
): Promise<ActionResult> {
  try {
    await setLinkState(await ctx(), id, state);
    revalidatePath("/links");
    revalidatePath(`/links/${id}`);
    return { ok: true, id };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteLinkAction(id: string): Promise<ActionResult> {
  try {
    await deleteLink(await ctx(), id);
    revalidatePath("/links");
    return { ok: true, id };
  } catch (error) {
    return fail(error);
  }
}

export async function bulkUpdateLinksAction(
  action: "archive" | "hide" | "unhide" | "tag" | "untag",
  ids: string[],
  tags: string[] = [],
): Promise<ActionResult> {
  try {
    const result = await bulkUpdateLinks(await ctx(), action, ids, tags);
    revalidatePath("/links");
    return {
      ok: result.failed.length === 0,
      error: result.failed.length
        ? `${result.failed.length} links could not be updated.`
        : undefined,
    };
  } catch (error) {
    return fail(error);
  }
}

export async function replaceRoutingRulesAction(
  linkId: string,
  rules: { longUrl: string; countryMatch: string[]; deviceMatch: string[]; osMatch: string[] }[],
): Promise<ActionResult> {
  try {
    await replaceRoutingRules(
      await ctx(),
      linkId,
      rules.map((rule, index) => ({
        position: index,
        longUrl: rule.longUrl,
        countryMatch: rule.countryMatch,
        countryExclude: [],
        regionMatch: [],
        regionExclude: [],
        deviceMatch: rule.deviceMatch,
        deviceExclude: [],
        osMatch: rule.osMatch,
        osExclude: [],
      })),
    );
    revalidatePath(`/links/${linkId}`);
    return { ok: true, id: linkId };
  } catch (error) {
    return fail(error);
  }
}

export async function addDeeplinkAction(
  linkId: string,
  input: { appUriPath: string; installUrl: string | null; os: "ios" | "android" },
): Promise<ActionResult> {
  try {
    await addDeeplink(await ctx(), linkId, { ...input, installType: "no_install" });
    revalidatePath(`/links/${linkId}`);
    return { ok: true, id: linkId };
  } catch (error) {
    return fail(error);
  }
}

export async function createQrCodeAction(input: {
  longUrl: string;
  code?: string;
  title?: string;
  design?: Record<string, unknown>;
  linkId?: string | null;
}): Promise<ActionResult> {
  try {
    const qr = await createQrCode(await ctx(), input);
    revalidatePath("/qr");
    return { ok: true, id: qr.id };
  } catch (error) {
    return fail(error);
  }
}

export async function updateQrCodeAction(
  id: string,
  patch: { title?: string; design?: Record<string, unknown>; longUrl?: string },
): Promise<ActionResult> {
  try {
    await updateQrCode(await ctx(), id, patch);
    revalidatePath("/qr");
    revalidatePath(`/qr/${id}`);
    return { ok: true, id };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteQrCodeAction(id: string): Promise<ActionResult> {
  try {
    await deleteQrCode(await ctx(), id);
    revalidatePath("/qr");
    return { ok: true, id };
  } catch (error) {
    return fail(error);
  }
}

export async function createQrTemplateAction(
  name: string,
  design: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    await createQrTemplate(await ctx(), name, design);
    revalidatePath("/qr/templates");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteQrTemplateAction(id: string): Promise<ActionResult> {
  try {
    await deleteQrTemplate(await ctx(), id);
    revalidatePath("/qr/templates");
    return { ok: true, id };
  } catch (error) {
    return fail(error);
  }
}

export async function createPageAction(input: {
  title: string;
  templateId?: string;
}): Promise<ActionResult> {
  try {
    const page = await createPage(await ctx(), input);
    revalidatePath("/pages");
    return { ok: true, id: page.id };
  } catch (error) {
    return fail(error);
  }
}

export async function updatePageAction(
  id: string,
  patch: { title?: string; slug?: string; appearance?: Record<string, string> },
): Promise<ActionResult> {
  try {
    await updatePage(await ctx(), id, patch);
    revalidatePath("/pages");
    revalidatePath(`/pages/${id}`);
    return { ok: true, id };
  } catch (error) {
    return fail(error);
  }
}

export async function deletePageAction(id: string): Promise<ActionResult> {
  try {
    await deletePage(await ctx(), id);
    revalidatePath("/pages");
    return { ok: true, id };
  } catch (error) {
    return fail(error);
  }
}

export type BlockType =
  | "link"
  | "image"
  | "youtube"
  | "carousel"
  | "grid"
  | "button"
  | "text"
  | "divider"
  | "embed"
  | "business_card";

export async function addBlockAction(
  pageId: string,
  type: BlockType,
  config: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    await addBlock(await ctx(), pageId, { type, config });
    revalidatePath(`/pages/${pageId}`);
    return { ok: true, id: pageId };
  } catch (error) {
    return fail(error);
  }
}

export async function updateBlockAction(
  pageId: string,
  blockId: string,
  config: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    await updateBlock(await ctx(), pageId, blockId, { config });
    revalidatePath(`/pages/${pageId}`);
    return { ok: true, id: pageId };
  } catch (error) {
    return fail(error);
  }
}

export async function removeBlockAction(pageId: string, blockId: string): Promise<ActionResult> {
  try {
    const { removeBlock } = await import("@steadlink/data");
    await removeBlock(await ctx(), pageId, blockId);
    revalidatePath(`/pages/${pageId}`);
    return { ok: true, id: pageId };
  } catch (error) {
    return fail(error);
  }
}

export async function reorderBlocksAction(
  pageId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  try {
    await reorderBlocks(await ctx(), pageId, orderedIds);
    revalidatePath(`/pages/${pageId}`);
    return { ok: true, id: pageId };
  } catch (error) {
    return fail(error);
  }
}

export async function setPageStatusAction(
  id: string,
  status: "draft" | "published" | "scheduled",
  scheduledFor?: string | null,
): Promise<ActionResult> {
  try {
    await setPageStatus(await ctx(), id, status, scheduledFor);
    revalidatePath("/pages");
    revalidatePath(`/pages/${id}`);
    return { ok: true, id };
  } catch (error) {
    return fail(error);
  }
}

export async function createCampaignAction(
  name: string,
  channels: string[],
): Promise<ActionResult> {
  try {
    const campaign = await createCampaign(await ctx(), name, channels);
    revalidatePath("/campaigns");
    return { ok: true, id: campaign.id };
  } catch (error) {
    return fail(error);
  }
}

export async function updateCampaignAction(id: string, name: string): Promise<ActionResult> {
  try {
    await updateCampaign(await ctx(), id, name);
    revalidatePath("/campaigns");
    return { ok: true, id };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteCampaignAction(id: string): Promise<ActionResult> {
  try {
    await deleteCampaign(await ctx(), id);
    revalidatePath("/campaigns");
    return { ok: true, id };
  } catch (error) {
    return fail(error);
  }
}

export async function saveUtmPresetAction(
  name: string,
  params: Record<string, string>,
): Promise<ActionResult> {
  try {
    await saveUtmPreset(await ctx(), name, params);
    revalidatePath("/settings");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function createWebhookAction(input: {
  name: string;
  event: string;
  url: string;
  authType: "hmac" | "basic" | "oauth2" | "none";
}): Promise<ActionResult> {
  try {
    await createWebhook(await ctx(), input);
    revalidatePath("/settings/webhooks");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function updateWebhookAction(
  id: string,
  patch: { name?: string; event?: string; url?: string; isActive?: boolean; fetchTags?: boolean },
): Promise<ActionResult> {
  try {
    await updateWebhook(await ctx(), id, patch);
    revalidatePath("/settings/webhooks");
    return { ok: true, id };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteWebhookAction(id: string): Promise<ActionResult> {
  try {
    await deleteWebhook(await ctx(), id);
    revalidatePath("/settings/webhooks");
    return { ok: true, id };
  } catch (error) {
    return fail(error);
  }
}

export async function createApiKeyAction(
  name: string,
  scopes: string[],
): Promise<ActionResult & { token?: string }> {
  try {
    const key = await createApiKey(await ctx(), name, scopes);
    revalidatePath("/settings/api");
    return { ok: true, token: key.token };
  } catch (error) {
    return fail(error);
  }
}

export async function revokeApiKeyAction(id: string): Promise<ActionResult> {
  try {
    await revokeApiKey(await ctx(), id);
    revalidatePath("/settings/api");
    return { ok: true, id };
  } catch (error) {
    return fail(error);
  }
}

export async function verifyDomainAction(id: string): Promise<ActionResult> {
  try {
    const domain = await verifyDomain(await ctx(), id);
    revalidatePath("/domains");
    return {
      ok: true,
      id,
      check: domain.dnsCheck?.checks ?? [],
      verified: domain.dnsCheck?.verified ?? false,
    };
  } catch (error) {
    return fail(error);
  }
}

export async function createBulkUploadAction(
  filename: string,
  rows: { longUrl: string; code?: string; title?: string; tags?: string[] }[],
): Promise<ActionResult> {
  try {
    const upload = await createBulkUpload(await ctx(), filename, rows);
    revalidatePath("/settings/bulk");
    return { ok: true, id: upload.id };
  } catch (error) {
    return fail(error);
  }
}

export async function saveAiSettingsAction(settings: {
  provider: string;
  baseUrl: string | null;
  model: string | null;
  enabled: boolean;
}): Promise<ActionResult> {
  try {
    await saveAiSettings(await ctx(), settings);
    revalidatePath("/settings");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/**
 * Work in a different group.
 *
 * The group is a working context, so it is a cookie rather than a column
 * on the account. The group has to be one of this workspace's own: the
 * cookie is a request from the outside, and it does not get to point at
 * another workspace's rows.
 */
export async function setActiveGroupAction(groupId: string): Promise<ActionResult> {
  try {
    const current = await ctx();
    const groups = await getGroups(current);
    const group = groups.find((candidate) => candidate.id === groupId);
    if (!group) {
      return { ok: false, error: "That group is not in this workspace." };
    }

    const jar = await cookies();
    jar.set(GROUP_COOKIE, group.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production" && process.env.APP_URL?.startsWith("https"),
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    revalidatePath("/", "layout");
    return { ok: true, id: group.id };
  } catch (error) {
    return fail(error);
  }
}
