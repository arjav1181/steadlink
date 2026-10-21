/**
 * The test object.
 *
 * Each spec file makes its own, so the hooks belong to that file and to no
 * other. A shared object would collect every file's hooks, and the suite
 * would reseed the database once per file that had ever run.
 */

import { test as base } from "@playwright/test";

import { reseed, watchForErrors } from "./support.ts";

export function makeTest() {
  const test = base.extend<{ errors: string[] }>({
    errors: async ({ page }, use) => {
      const errors = watchForErrors(page);
      await use(errors);
    },
  });

  /**
   * Put the seeded data back before the file runs.
   *
   * The specs share one database, and some of them change it: a link is
   * archived here, a campaign is made there. Without this, a spec runs
   * against the world the earlier spec left behind, and a failure says
   * nothing about the code.
   */
  test.beforeAll(async () => {
    await reseed();
  });

  return test;
}
