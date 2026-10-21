/**
 * The shape of every public API response.
 *
 * One place decides what an error looks like, so a caller can branch on
 * `code` without reading the message, and every route answers in the same
 * shape whether it succeeded or not.
 */

import { DataError, ForbiddenError } from "@golink/data";
import { NextResponse } from "next/server";

import { ApiError, errorBody } from "./api-auth";

/** The data layer's error codes, mapped to the status they deserve. */
const STATUS_BY_CODE: Record<string, number> = {
  NOT_FOUND: 404,
  SLUG_TAKEN: 409,
  DOMAIN_EXISTS: 409,
  DOMAIN_IN_USE: 409,
  GROUP_IS_DEFAULT: 409,
  NO_DOMAIN: 409,
  NO_CHANNELS: 400,
  TOO_MANY_RULES: 400,
  INVALID_URL: 400,
  INVALID_CODE: 400,
  INVALID_NAME: 400,
  INVALID_DOMAIN: 400,
  INSECURE_URL: 400,
};

export function json(body: unknown, status = 200, headers?: Record<string, string>) {
  return NextResponse.json(body, { status, headers });
}

/**
 * Run a route handler and turn anything it throws into a response.
 *
 * The data layer throws `DataError` with a code, the authorisation helper
 * throws `ForbiddenError`, and the API layer throws `ApiError`. All three
 * become a JSON body with a code. Anything else becomes a 500 with a
 * generic message, because the details of an unexpected failure are not
 * the caller's business.
 */
export async function handle(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ApiError) {
      return json(errorBody(error), error.status);
    }
    if (error instanceof ForbiddenError) {
      return json({ message: error.message, code: "FORBIDDEN" }, 403);
    }
    if (error instanceof DataError) {
      const status = STATUS_BY_CODE[error.code] ?? 400;
      return json({ message: error.message, code: error.code }, status);
    }
    console.error("[api] unhandled error", error);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
      // Next truncates the stack it prints. The whole one goes to a file.
      try {
        const { appendFileSync } = require("node:fs") as typeof import("node:fs");
        appendFileSync("/tmp/opencode/api-errors.log", `${error.stack}\n\n`);
      } catch {
        // The file is a convenience, not a requirement.
      }
    }
    return json({ message: "Something went wrong on our side.", code: "INTERNAL" }, 500);
  }
}

/** The name of a body field, for a validation message. */
export function fieldError(field: string, message: string) {
  return new ApiError(400, "INVALID_REQUEST", `${field}: ${message}`);
}

/** A required string field. */
export function requireString(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw fieldError(field, "is required and must be a string.");
  }
  return value.trim();
}

/** An optional string field. */
export function optionalString(body: Record<string, unknown>, field: string): string | undefined {
  const value = body[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw fieldError(field, "must be a string.");
  return value;
}

/** An optional array of strings. */
export function optionalStringArray(
  body: Record<string, unknown>,
  field: string,
): string[] | undefined {
  const value = body[field];
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw fieldError(field, "must be an array of strings.");
  }
  return value as string[];
}

/** A query parameter, as a string. */
export function queryParam(request: Request, name: string): string | null {
  const value = new URL(request.url).searchParams.get(name);
  return value === null ? null : value.trim();
}

/** A query parameter, as a bounded number. */
export function queryNumber(
  request: Request,
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = queryParam(request, name);
  if (raw === null || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw fieldError(name, "must be a number.");
  return Math.min(max, Math.max(min, Math.trunc(value)));
}
