/**
 * better-auth configuration.
 *
 * better-auth owns identity: users, sessions, accounts, organizations,
 * members, invitations and API keys. The domain tables in @golink/db point
 * at them.
 *
 * Every credential in here comes from the operator's own environment. This
 * file never contains a key, and nothing here talks to a third party unless
 * the operator configured it.
 *
 * The instance is built on first use, not at import. A production build
 * imports this module to collect the routes, and the secret is a runtime
 * secret: a container that is built without one and started with one has to
 * work. Throwing at import time would break the build.
 */

import { apiKey } from "@better-auth/api-key";
import { createWorkspaceDefaults, db, schema } from "@golink/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { jwt, organization } from "better-auth/plugins";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3210";

function createAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error(
      "BETTER_AUTH_SECRET must be set in production. Copy .env.example to .env and fill it in.",
    );
  }

  return betterAuth({
    appName: "GoLink",
    baseURL,
    secret: secret ?? "development-only-secret-change-me",
    database: drizzleAdapter(db(), {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        organization: schema.organization,
        member: schema.member,
        invitation: schema.invitation,
        apikey: schema.apikey,
        jwks: schema.jwks,
      },
    }),

    emailAndPassword: {
      enabled: true,
      // The email is sent by our own sender, not by better-auth's default.
      sendResetPassword: async ({ user, token }) => {
        const { sendPasswordReset } = await import("@golink/email");
        await sendPasswordReset(user.email, token);
      },
      autoSignIn: true,
      requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === "true",
    },

    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, token }) => {
        const { sendVerificationEmail } = await import("@golink/email");
        await sendVerificationEmail(user.email, token);
      },
      autoSignInAfterVerification: true,
    },

    socialProviders: {
      // Only configured when the operator supplies their own client. better-auth
      // treats a missing key as "this provider is off".
      ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
              // The narrowest scope that still identifies the user.
              scope: ["email", "profile"],
            },
          }
        : {}),
    },

    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 60 * 5 },
    },

    // Sign up, sign in and password reset are the three endpoints an
    // attacker wants to hammer. The limits are per address, and the
    // window is long enough that a burst is refused but a person is not.
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 10 },
        "/sign-up/email": { window: 300, max: 5 },
        "/request-password-reset": { window: 900, max: 3 },
        "/send-verification-email": { window: 900, max: 3 },
        "/forget-password": { window: 900, max: 3 },
      },
    },

    user: {
      deleteUser: {
        // Deleting an account has to take the organization with it, or the links
        // are left pointing at nothing.
        enabled: true,
      },
      changeEmail: { enabled: true },
    },

    advanced: {
      // UUIDs, so the id spaces match the domain tables.
      database: { generateId: "uuid" },
      cookiePrefix: "golink",
      // Whether the cookie is secure follows the request, not the build. A
      // self-hosted install is often on plain http on a private network, and
      // a cookie with the `__Secure-` prefix is refused there — which
      // would leave nobody able to sign in. better-auth reads the protocol
      // from the request, so an install behind https gets a secure cookie
      // and one on http does not.
      //
      // Set BETTER_AUTH_SECURE_COOKIES to true or false to decide for
      // yourself, for instance when the proxy does not say what protocol
      // the client used.
      useSecureCookies: process.env.BETTER_AUTH_SECURE_COOKIES
        ? process.env.BETTER_AUTH_SECURE_COOKIES === "true"
        : undefined,
    },

    plugins: [
      organization({
        allowUserToCreateOrganization: true,
        organizationLimit: 10,
        creatorRole: "owner",
        // A workspace is only usable once it has a group, a domain and a
        // plan. better-auth creates the organization and the membership;
        // the three things below are ours.
        organizationHooks: {
          afterCreateOrganization: async ({ organization: created }) => {
            await createWorkspaceDefaults({
              orgId: created.id,
              slug: created.slug,
            });
          },
        },
      }),
      apiKey({
        // Keys belong to a workspace, so a leaked key cannot read another
        // workspace's links.
        defaultPrefix: "gl",
        enableMetadata: true,
        permissions: {
          defaultPermissions: {
            links: ["read", "create", "update", "delete"],
            qrCodes: ["read", "create", "update", "delete"],
            pages: ["read", "create", "update", "delete"],
            campaigns: ["read", "create", "update", "delete"],
          },
        },
      }),
      jwt(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

let instance: Auth | null = null;

/** The auth instance, built on first use. */
export function getAuth(): Auth {
  if (!instance) instance = createAuth();
  return instance;
}
