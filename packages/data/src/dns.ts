/**
 * DNS checking.
 *
 * A custom domain goes live when the records the operator was told to
 * create actually resolve. This asks the resolver directly — no third
 * party, no API key, no rate limit on someone else's account.
 *
 * Every lookup is optional: a domain that has not been set up yet simply
 * has no records, and that is not an error. It is the expected state.
 */

import { resolve4, resolve6, resolveCname, resolveTxt } from "node:dns/promises";

export interface DnsRecord {
  type: string;
  name: string;
  value: string;
}

export interface DnsResult {
  /** What was found for each record that was expected. */
  checks: {
    type: string;
    name: string;
    expected: string;
    found: string | null;
    ok: boolean;
  }[];
  /** True when every expected record was found with the right value. */
  verified: boolean;
  checkedAt: string;
}

/** The resolver errors when there is no record. That is not a failure. */
async function quietly<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

/** The name a record is published under. */
function recordName(name: string, host: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed === "@") return host;
  if (trimmed.endsWith(".")) return trimmed;
  return `${trimmed}.${host}`;
}

/** One lookup, per type. */
async function lookup(type: string, name: string): Promise<string[] | null> {
  if (type === "CNAME") {
    // The resolver answers with the chain of names it walked through.
    const targets = await quietly(() => resolveCname(name));
    return targets && targets.length > 0 ? targets : null;
  }

  if (type === "TXT") {
    const chunks = await quietly(() => resolveTxt(name));
    return chunks ? chunks.map((parts) => parts.join("")) : null;
  }
  if (type === "A") {
    const addresses = await quietly(() => resolve4(name));
    return addresses ?? null;
  }
  if (type === "AAAA") {
    const addresses = await quietly(() => resolve6(name));
    return addresses ?? null;
  }
  return null;
}

/**
 * Check the records a domain is supposed to have.
 *
 * A CNAME is compared case-insensitively, because DNS names are not
 * case-sensitive and a provider will happily answer with a different
 * case than the one you asked for. A TXT record is compared exactly,
 * because the token in it is a secret.
 */
export async function checkDnsRecords(host: string, records: DnsRecord[]): Promise<DnsResult> {
  const checks: DnsResult["checks"] = [];

  for (const record of records) {
    const name = recordName(record.name, host);
    const found = await lookup(record.type, name);
    const values = found ?? [];

    let ok = false;
    if (record.type === "CNAME") {
      ok = values.some(
        (value) =>
          value.toLowerCase().replace(/\.$/, "") === record.value.toLowerCase().replace(/\.$/, ""),
      );
    } else if (record.type === "TXT") {
      ok = values.some((value) => value === record.value);
    } else {
      ok = values.includes(record.value);
    }

    checks.push({
      type: record.type,
      name,
      expected: record.value,
      found: values.length > 0 ? values.join(", ") : null,
      ok,
    });
  }

  return {
    checks,
    verified: checks.length > 0 && checks.every((check) => check.ok),
    checkedAt: new Date().toISOString(),
  };
}
