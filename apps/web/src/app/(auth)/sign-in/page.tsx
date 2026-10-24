import Link from "next/link";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Sign in — Steadlink" };

export default function SignInPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Sign in</h1>
      <p className="mt-1 text-sm text-muted">Welcome back. Your links are where you left them.</p>
      <div className="mt-6">
        <AuthForm mode="sign-in" />
      </div>
      <p className="mt-6 text-sm text-muted">
        No account yet?{" "}
        <Link href="/sign-up" className="font-semibold text-accent hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
