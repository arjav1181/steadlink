"use client";

import { Button, Field, TextInput } from "@steadlink/ui";
import { useRouter } from "next/navigation";
import * as React from "react";

import { signInAction, signUpAction } from "@/app/auth-actions";

/**
 * The sign-in and sign-up form. One component, two modes: the difference
 * between them is a field and a word, not a different flow.
 */
export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [orgName, setOrgName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const result =
      mode === "sign-in"
        ? await signInAction(email.trim(), password)
        : await signUpAction({
            email: email.trim(),
            password,
            displayName: displayName.trim(),
            orgName: orgName.trim(),
          });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "That did not work. Try again.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode === "sign-up" ? (
        <>
          <Field label="Your name" htmlFor="auth-name" required>
            <TextInput
              id="auth-name"
              autoComplete="name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
            />
          </Field>
          <Field label="Workspace name" htmlFor="auth-org" required hint="You can rename it later.">
            <TextInput
              id="auth-org"
              value={orgName}
              onChange={(event) => setOrgName(event.target.value)}
              placeholder="Acme Studio"
              required
            />
          </Field>
        </>
      ) : null}

      <Field label="Email" htmlFor="auth-email" required>
        <TextInput
          id="auth-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />
      </Field>

      <Field
        label="Password"
        htmlFor="auth-password"
        required
        hint={mode === "sign-up" ? "At least 10 characters." : undefined}
      >
        <TextInput
          id="auth-password"
          type="password"
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={mode === "sign-up" ? 10 : undefined}
          required
        />
      </Field>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Button type="submit" loading={busy} className="w-full">
        {mode === "sign-in" ? "Sign in" : "Create the workspace"}
      </Button>
    </form>
  );
}
