import { makeTest } from "./spec.ts";
import { expect, expectNoErrors, signIn } from "./support.ts";

const test = makeTest();

/**
 * A saved design.
 *
 * The designs screen lists the designs a workspace has, and the designer
 * is where they are made and used. A design that cannot be applied is a
 * picture of a design, so the test applies one and looks at the result.
 */

test.describe("saved QR designs", () => {
  test("a design can be saved and used again", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/qr?new=1");

    await page.getByLabel("Destination URL").fill("https://example.com/templated");
    await page.getByRole("button", { name: "Design your code" }).click();

    // A design worth keeping.
    await page.getByLabel("Text under the code").fill("Table tent");
    await page.getByLabel("Name this design").fill("Table tent design");
    await page.getByRole("button", { name: "Save this design" }).click();
    await expect(page.getByText("Saved as Table tent design.")).toBeVisible();

    // The saved designs screen lists it.
    await page.goto("/qr/templates");
    await expect(page.getByText("Table tent design")).toBeVisible();
    expectNoErrors(errors);
  });

  test("a saved design can be applied to a new code", async ({ page, errors }) => {
    await signIn(page);

    // Make one to apply.
    await page.goto("/qr?new=1");
    await page.getByLabel("Destination URL").fill("https://example.com/to-apply");
    await page.getByRole("button", { name: "Design your code" }).click();
    await page.getByLabel("Text under the code").fill("Scan for the menu");
    await page.getByLabel("Name this design").fill("Menu card");
    await page.getByRole("button", { name: "Save this design" }).click();
    await expect(page.getByText("Saved as Menu card.")).toBeVisible();

    // Start another code, and put the design back.
    await page.goto("/qr?new=1");
    await page.getByLabel("Destination URL").fill("https://example.com/applied");
    await page.getByRole("button", { name: "Design your code" }).click();

    await page.getByLabel("Text under the code").fill("");
    await expect(page.getByLabel("Text under the code")).toHaveValue("");

    await page.getByRole("button", { name: "Apply the Menu card design" }).click();
    await expect(page.getByLabel("Text under the code")).toHaveValue("Scan for the menu");
    expectNoErrors(errors);
  });

  test("a design with no name is refused", async ({ page, errors }) => {
    await signIn(page);
    await page.goto("/qr?new=1");

    await page.getByLabel("Destination URL").fill("https://example.com/unnamed");
    await page.getByRole("button", { name: "Design your code" }).click();
    await page.getByRole("button", { name: "Save this design" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "Give the design a name" }),
    ).toBeVisible();
    expectNoErrors(errors);
  });
});
