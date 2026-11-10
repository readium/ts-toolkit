import { test, expect } from "@playwright/test";
import { settle } from "./support.ts";

// One decoration per screenshot, over a paragraph split across both columns of a paginated chapter.
for (const type of ["highlight", "underline", "outline", "mask", "textColor"]) {
    test.describe(type, () => {
        for (const layout of ["boxes", "bounds"]) {
            for (const width of ["wrap", "bounds", "page", "viewport"]) {
                test(`${layout}-${width}`, async ({ page }) => {
                    await page.goto(`/chapter.html?type=${type}&layout=${layout}&width=${width}`);
                    await settle(page);
                    await expect(page).toHaveScreenshot(["chapter", type, `${layout}-${width}.png`], { maxDiffPixels: 10 });
                });
            }
        }
    });
}
