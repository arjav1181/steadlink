/**
 * The v4 shape.
 *
 * The public API answers in snake_case, the way the reference API does, so
 * a script written against the documentation works here too. The mapping
 * lives in one file: the database speaks camelCase and the API speaks
 * snake_case, and only this file knows both.
 *
 * Nothing here reaches into the database. It takes what the data layer
 * returned and reshapes it.
 */

import type { LinkWithMeta, Page, QrCode } from "@steadlink/data";

/**
 * The host a short link is served from.
 *
 * The operator sets it once, and every workspace gets a subdomain of it.
 */
export function publicHost(): string {
  return process.env.DEFAULT_SHORT_DOMAIN ?? "go.arjav.is-cool.dev";
}

/** The public address of a short code. */
export function shortUrl(host: string, code: string): string {
  return `https://${host}/${code}`;
}

export interface V4Link {
  id: string;
  link: string;
  long_url: string;
  custom_back_half: string;
  custom_domain: string;
  short_url: string;
  title: string | null;
  tags: string[];
  archived: boolean;
  hidden: boolean;
  active: boolean;
  expires_at: string | null;
  created_at: string;
  modified_at: string;
  click_count: number;
  engagement_count: number;
  group: { id: string; name: string; slug: string } | null;
  campaign_id: string | null;
  channel_id: string | null;
  qr_code: V4QrCode | null;
}

export function v4Link(link: LinkWithMeta, host = publicHost()): V4Link {
  const now = Date.now();
  const expired = link.expiresAt ? new Date(link.expiresAt).getTime() <= now : false;
  return {
    id: link.id,
    link: link.longUrl,
    long_url: link.longUrl,
    custom_back_half: link.code,
    custom_domain: link.domain.host,
    short_url: shortUrl(link.domain.host || host, link.code),
    title: link.title,
    tags: link.tags ?? [],
    archived: link.archivedAt !== null,
    hidden: link.hiddenAt !== null,
    active: link.archivedAt === null && link.hiddenAt === null && !expired,
    expires_at: link.expiresAt,
    created_at: link.createdAt,
    modified_at: link.updatedAt,
    click_count: link.clickCountTotal ?? link.clickCount,
    engagement_count: link.engagementCount ?? 0,
    group: link.group ? { id: link.group.id, name: link.group.name, slug: link.group.slug } : null,
    campaign_id: link.campaignId,
    channel_id: link.channelId,
    qr_code: link.qrCode ? v4QrCode(link.qrCode) : null,
  };
}

export interface V4QrCode {
  id: string;
  code: string;
  title: string | null;
  long_url: string;
  short_url: string;
  custom_domain: string;
  design: Record<string, unknown>;
  tags: string[];
  archived: boolean;
  expires_at: string | null;
  scan_count: number;
  created_at: string;
  modified_at: string;
  link_id: string | null;
}

export function v4QrCode(code: QrCode, host = publicHost()): V4QrCode {
  return {
    id: code.id,
    code: code.code,
    title: code.title,
    long_url: code.longUrl,
    short_url: shortUrl(host, code.code),
    custom_domain: host,
    design: code.design ?? {},
    tags: code.tags ?? [],
    archived: code.archivedAt !== null,
    expires_at: code.expiresAt,
    scan_count: code.scanCountTotal ?? code.scanCount,
    created_at: code.createdAt,
    modified_at: code.updatedAt,
    link_id: code.linkId,
  };
}

export interface V4Page {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "scheduled";
  public_url: string;
  scheduled_for: string | null;
  published_at: string | null;
  created_at: string;
  modified_at: string;
  views: number;
  blocks: { id: string; type: string; position: number }[];
}

export function v4Page(page: Page, host = publicHost()): V4Page {
  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    status: page.status,
    public_url: `https://${host}/p/${page.slug}`,
    scheduled_for: page.scheduledFor,
    published_at: page.publishedAt,
    created_at: page.createdAt,
    modified_at: page.updatedAt,
    views: page.views,
    blocks: (page.blocks ?? []).map((block) => ({
      id: block.id,
      type: block.type,
      position: block.position,
    })),
  };
}
