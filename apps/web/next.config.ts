import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The redirect hot path runs in a custom server (apps/web/server.ts).
  // `output: "standalone"` cannot be combined with a custom server, so it is
  // deliberately not enabled here.
  reactStrictMode: true,

  // The design system's package lives in the workspace, so Next treats it as
  // a dependency and leaves it alone. Its "use client" directives then never
  // reach the compiler, and every component in it is a server component:
  // passing one to a client component as a prop then fails at run time with
  // "Functions cannot be passed directly to Client Components".
  //
  // The icons have the same problem from the other side: lucide-react ships
  // without a "use client" directive, so an icon handed to a client
  // component as a prop has to be transpiled as well.
  //
  // Transpiling the packages makes the directives real. The cost is a
  // slower build, and the build is a minute.
  transpilePackages: ["@golink/ui", "lucide-react"],

  turbopack: {
    // The monorepo root, not the git root. Without this, Turbopack resolves
    // loaders from whatever node_modules sits above the repository, which is
    // how a stray tailwindcss ends up being loaded from outside the project.
    root: path.join(import.meta.dirname, "../.."),
  },
};

export default nextConfig;
