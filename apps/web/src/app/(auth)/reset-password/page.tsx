"use client";

import { Button, Field, TextInput } from "@golink/ui";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";

import { resetPasswordAction } from "@/app/auth-actions";

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const result = await resetPasswordAction(token, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "That did not work.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-foreground">Password changed</h1>
        <p className="mt-1 text-sm text-muted">You can sign in with your new password now.</p>
        <Link
          href="/sign-in"
          className="mt-6 inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Choose a new password</h1>
      <p className="mt-1 text-sm text-muted">
        Ten characters or more, and not the same as last time.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="New password" htmlFor="reset-password" required>
          <TextInput
            id="reset-password"
            type="password"
            autoComplete="new-password"
            minLength={10}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" loading={busy} className="w-full">
          Save the new password
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  // useSearchParams needs a Suspense boundary, or the page cannot be
  // prerendered.
  return (
    <React.Suspense fallback={null}>
      <ResetPasswordForm />
    </React.Suspense>
  );
}
