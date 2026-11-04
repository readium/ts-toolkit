import { test, expect } from "@playwright/test";
import { settle } from "./support.ts";

// One case per screenshot, in column 2 of a paginated two-column document.
for (const type of ["highlight", "underline", "outline", "mask"]) {
    test.describe(type, () => {
        for (const layout of ["boxes", "bounds"]) {
            for (const width of ["page", "viewport"]) {
                test(`${layout}-${width}`, async ({ page }) => {
                    await page.goto(`/grid.html?type=${type}&cols=2&layout=${layout}&width=${width}`);
                    await settle(page);
                    await expect(page).toHaveScreenshot(["columns", type, `${layout}-${width}.png`], { maxDiffPixels: 10 });
                });
            }
        }
    });
}
