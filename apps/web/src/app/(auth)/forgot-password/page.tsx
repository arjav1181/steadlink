"use client";

import { Button, Field, TextInput } from "@golink/ui";
import Link from "next/link";
import * as React from "react";

import { requestPasswordResetAction } from "@/app/auth-actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    await requestPasswordResetAction(email.trim());
    setBusy(false);
    setSent(true);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Reset your password</h1>
      {sent ? (
        <div className="mt-6 rounded-md border border-border bg-surface-2 p-4">
          <p className="text-sm font-medium text-foreground">Check your email</p>
          <p className="mt-1 text-sm text-muted">
            If that address has an account, a reset link is on its way. The link works once and
            expires in 30 minutes.
          </p>
          <Link
            href="/sign-in"
            className="mt-3 inline-block text-sm font-semibold text-accent hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">
            Enter the address you signed up with and we will send a reset link.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Email" htmlFor="forgot-email" required>
              <TextInput
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </Field>
            <Button type="submit" loading={busy} className="w-full">
              Send the reset link
            </Button>
          </form>
          <p className="mt-6 text-sm text-muted">
            <Link href="/sign-in" className="font-semibold text-accent hover:underline">
              Back to sign in
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
