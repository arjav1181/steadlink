import Link from "next/link";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Create an account — GoLink" };

export default function SignUpPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
      <p className="mt-1 text-sm text-muted">Free to self-host. No card, no trial clock.</p>
      <div className="mt-6">
        <AuthForm mode="sign-up" />
      </div>
      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
