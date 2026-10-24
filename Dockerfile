# Steadlink
#
# Two stages that matter: one that builds, one that runs.
#
# The running image carries the workspace packages as source, because the
# custom server runs them directly with Node's type stripping. That is one
# copy of the code, and it is the same code the tests run.

# --- build ---------------------------------------------------------------
FROM node:24-bookworm-slim AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /app

# The lockfile first, so the install is cached until a dependency changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/db/package.json packages/db/
COPY packages/data/package.json packages/data/
COPY packages/auth/package.json packages/auth/
COPY packages/email/package.json packages/email/
COPY packages/ui/package.json packages/ui/
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @steadlink/web build

# --- run -----------------------------------------------------------------
FROM node:24-bookworm-slim AS run

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=production
RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates tini \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps ./apps
COPY --from=build /app/packages/db/migrations ./packages/db/migrations

# The migrations run as the superuser; the application connects as the
# unprivileged role the row level security policies apply to. So the image
# carries both URLs, and only the second one is the application's.
ENV DATABASE_MIGRATION_URL=postgres://postgres:postgres@postgres:5432/steadlink
ENV DATABASE_URL=postgres://steadlink:steadlink@postgres:5432/steadlink

# The data directory the geo database is mounted into.
VOLUME ["/data/geoip"]

EXPOSE 3210

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["pnpm", "--filter", "@steadlink/web", "start"]
