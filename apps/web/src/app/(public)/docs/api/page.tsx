import Link from "next/link";

export const metadata = { title: "The API — Steadlink" };
export const dynamic = "force-dynamic";

const ENDPOINTS: {
  method: string;
  path: string;
  scope: string;
  does: string;
}[] = [
  { method: "GET", path: "/api/v4/user", scope: "any", does: "who the token belongs to" },
  {
    method: "GET",
    path: "/api/v4/links",
    scope: "links:read",
    does: "list links, with filters, sorting and paging",
  },
  { method: "POST", path: "/api/v4/links", scope: "links:write", does: "create a link" },
  { method: "GET", path: "/api/v4/links/{id}", scope: "links:read", does: "one link" },
  {
    method: "PATCH",
    path: "/api/v4/links/{id}",
    scope: "links:write",
    does: "change the title, the tags, the expiry or the state",
  },
  {
    method: "DELETE",
    path: "/api/v4/links/{id}",
    scope: "links:delete",
    does: "remove a link for good",
  },
  {
    method: "GET",
    path: "/api/v4/links/{id}/clicks",
    scope: "analytics:read",
    does: "the clicks on a link, over a range",
  },
  {
    method: "GET",
    path: "/api/v4/links/{id}/export",
    scope: "analytics:read",
    does: "the clicks on a link, as a spreadsheet",
  },
  { method: "GET", path: "/api/v4/qr-codes", scope: "qr:read", does: "list the QR codes" },
  { method: "POST", path: "/api/v4/qr-codes", scope: "qr:write", does: "create a QR code" },
  { method: "GET", path: "/api/v4/qr-codes/{id}", scope: "qr:read", does: "one QR code" },
  {
    method: "PATCH",
    path: "/api/v4/qr-codes/{id}",
    scope: "qr:write",
    does: "change the title, the design or the expiry",
  },
  { method: "DELETE", path: "/api/v4/qr-codes/{id}", scope: "qr:write", does: "remove a QR code" },
  { method: "GET", path: "/api/v4/pages", scope: "pages:read", does: "list the pages" },
  { method: "POST", path: "/api/v4/pages", scope: "pages:write", does: "create a page" },
  {
    method: "GET",
    path: "/api/v4/pages/{id}",
    scope: "pages:read",
    does: "one page and its blocks",
  },
  {
    method: "PATCH",
    path: "/api/v4/pages/{id}",
    scope: "pages:write",
    does: "change the title, the address or the appearance",
  },
  { method: "DELETE", path: "/api/v4/pages/{id}", scope: "pages:write", does: "remove a page" },
  { method: "GET", path: "/api/v4/groups", scope: "groups:read", does: "list the link groups" },
  { method: "POST", path: "/api/v4/groups", scope: "groups:write", does: "create a group" },
  { method: "PATCH", path: "/api/v4/groups/{id}", scope: "groups:write", does: "rename a group" },
  {
    method: "DELETE",
    path: "/api/v4/groups/{id}",
    scope: "groups:write",
    does: "remove a group; its links move to the default one",
  },
  {
    method: "GET",
    path: "/api/v4/campaigns",
    scope: "campaigns:read",
    does: "list the campaigns and their channels",
  },
  {
    method: "POST",
    path: "/api/v4/campaigns",
    scope: "campaigns:write",
    does: "create a campaign with at least one channel",
  },
  {
    method: "PATCH",
    path: "/api/v4/campaigns/{id}",
    scope: "campaigns:write",
    does: "rename a campaign",
  },
  {
    method: "DELETE",
    path: "/api/v4/campaigns/{id}",
    scope: "campaigns:write",
    does: "remove a campaign",
  },
  {
    method: "GET",
    path: "/api/v4/expand",
    scope: "none",
    does: "what a short link points at; no token needed",
  },
];

const EXAMPLE = `curl -H "Authorization: Bearer gl_..." \\
  https://go.arjav.is-cool.dev/api/v4/links?limit=5

curl -X POST -H "Authorization: Bearer gl_..." \\
  -H "Content-Type: application/json" \\
  -d '{"long_url":"https://example.com","custom_back_half":"spring"}' \\
  https://go.arjav.is-cool.dev/api/v4/links`;

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-semibold text-muted">Steadlink</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">The API</h1>
      <p className="mt-3 text-muted">
        Everything the dashboard does, over HTTP. A token goes in the{" "}
        <code className="rounded bg-accent px-1.5 py-0.5 font-mono text-xs text-accent-foreground">
          Authorization
        </code>{" "}
        header, and the answers come back as JSON with the field names in snake case.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-foreground">A first call</h2>
      <pre className="mt-3 overflow-x-auto rounded-md bg-accent p-4 text-sm text-accent-foreground">
        <code>{EXAMPLE}</code>
      </pre>

      <h2 className="mt-10 text-xl font-semibold text-foreground">Tokens</h2>
      <p className="mt-2 text-sm text-muted">
        A token is made in Settings, then API. It belongs to a workspace, and it carries the scopes
        it is allowed to use. A token is shown once, at the moment it is made: only a hash of it is
        kept, so it cannot be read back later. If it is lost, make another one and revoke this one.
      </p>
      <p className="mt-2 text-sm text-muted">
        The scopes are <code className="font-mono text-xs">links:read</code>,{" "}
        <code className="font-mono text-xs">links:write</code>,{" "}
        <code className="font-mono text-xs">links:delete</code>,{" "}
        <code className="font-mono text-xs">qr:read</code>,{" "}
        <code className="font-mono text-xs">qr:write</code>,{" "}
        <code className="font-mono text-xs">pages:read</code>,{" "}
        <code className="font-mono text-xs">pages:write</code>,{" "}
        <code className="font-mono text-xs">groups:read</code>,{" "}
        <code className="font-mono text-xs">groups:write</code>,{" "}
        <code className="font-mono text-xs">campaigns:read</code>,{" "}
        <code className="font-mono text-xs">campaigns:write</code> and{" "}
        <code className="font-mono text-xs">analytics:read</code>. A call that needs a scope the
        token does not hold comes back as <code className="font-mono text-xs">403</code> and says
        which one.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-foreground">The endpoints</h2>
      <div className="mt-4 overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">The API endpoints</caption>
          <thead>
            <tr className="border-b border-border bg-surface-2">
              {["", "Path", "Scope", "What it does"].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="px-3 py-2 text-xs font-semibold uppercase text-muted"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ENDPOINTS.map((row) => (
              <tr key={`${row.method} ${row.path}`}>
                <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap text-muted">
                  {row.method}
                </td>
                <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">{row.path}</td>
                <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap text-muted">
                  {row.scope}
                </td>
                <td className="px-3 py-2.5 text-muted">{row.does}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-xl font-semibold text-foreground">When a call goes wrong</h2>
      <p className="mt-2 text-sm text-muted">
        The body always carries a message and a code, so a script can branch on the code and show
        the message to a person.
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-muted">
        <li>
          <code className="font-mono text-xs">400 INVALID_REQUEST</code> — a field is missing or the
          wrong shape.
        </li>
        <li>
          <code className="font-mono text-xs">401 UNAUTHORIZED</code> — no token, or a token that is
          not valid.
        </li>
        <li>
          <code className="font-mono text-xs">403 INSUFFICIENT_SCOPE</code> — the token does not
          hold the scope the call needs. The message names it.
        </li>
        <li>
          <code className="font-mono text-xs">404 NOT_FOUND</code> — it is not there, or it is not
          yours. The two are the same answer on purpose.
        </li>
        <li>
          <code className="font-mono text-xs">429 RATE_LIMITED</code> — too many calls. The
          <code className="font-mono text-xs"> Retry-After </code>
          header says how long to wait.
        </li>
      </ul>

      <p className="mt-10 text-sm text-muted">
        <Link className="underline underline-offset-4 hover:text-foreground" href="/">
          Back to the front page
        </Link>
      </p>
    </div>
  );
}
