import { makeTest } from "./spec.ts";
import { expect, expectNoErrors, signIn } from "./support.ts";

const test = makeTest();

/**
 * F08 — bulk shorten from a spreadsheet.
 *
 * S11 → S15 upload → column mapping → S16 status → S13.
 */

const CSV_HEADER = "long_url,title,code,tags";

test.describe("F08 bulk upload", () => {
  test("F08-H1 a well-formed upload makes the links", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/settings/bulk");

    await page.getByLabel("File name").fill("e2e-catalog.csv");
    await page
      .getByLabel("Rows")
      .fill(
        [
          CSV_HEADER,
          "https://example.com/one,Product one,f08-one,alpha",
          "https://example.com/two,Product two,f08-two,beta",
          "https://example.com/three,Product three,f08-three,beta",
        ].join("\n"),
      );
    await page.getByRole("button", { name: "Start the upload" }).click();

    await expect(page.getByText("e2e-catalog.csv")).toBeVisible();
    await expect(page.getByText(/3 of 3 created/)).toBeVisible();

    // And the links are there.
    await page.goto("/links?q=f08-one");
    await expect(page.getByRole("link", { name: /product one/i }).first()).toBeVisible();
    expectNoErrors(errors);
  });

  test("F08-H2 a bad row is listed with its reason and the rest are made", async ({
    page,
    errors,
  }) => {
    await signIn(page);
    await page.goto("/settings/bulk");

    await page.getByLabel("File name").fill("e2e-partial.csv");
    await page
      .getByLabel("Rows")
      .fill(
        [CSV_HEADER, "https://example.com/good-one,f08-good,good", "not-a-url,f08-bad,bad"].join(
          "\n",
        ),
      );
    await page.getByRole("button", { name: "Start the upload" }).click();

    await expect(page.getByText("e2e-partial.csv")).toBeVisible();
    await expect(page.getByText(/1 of 2 created/).first()).toBeVisible();
    await expect(page.getByText(/Row 2/)).toBeVisible();
    expectNoErrors(errors);
  });

  test("F08-E4 the same back-half twice in one file", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/settings/bulk");

    await page.getByLabel("File name").fill("e2e-dupes.csv");
    await page
      .getByLabel("Rows")
      .fill(
        [
          CSV_HEADER,
          "https://example.com/dupe-a,f08-dupe,dupe",
          "https://example.com/dupe-b,f08-dupe,dupe",
        ].join("\n"),
      );
    await page.getByRole("button", { name: "Start the upload" }).click();

    await expect(page.getByText("e2e-dupes.csv")).toBeVisible();
    // One of them is made, the other is refused, and the refusal is shown.
    await expect(page.getByText(/1 of 2 created/).first()).toBeVisible();
    expectNoErrors(errors);
  });

  test("F08-N1 an empty file is refused", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/settings/bulk");

    await page.getByRole("button", { name: "Start the upload" }).click();
    await expect(page.locator("form").getByRole("alert")).toContainText(/at least one row/i);
    expectNoErrors(errors);
  });

  test("F08-N2 a file with no long_url column is refused", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/settings/bulk");

    await page.getByLabel("File name").fill("e2e-nocolumn.csv");
    await page.getByLabel("Rows").fill("name,code\nProduct one,f08-nocolumn");
    await page.getByRole("button", { name: "Start the upload" }).click();

    await expect(page.locator("form").getByRole("alert")).toBeVisible();
    expectNoErrors(errors);
  });
});
