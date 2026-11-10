import { test, expect } from "@playwright/test";
import { settle } from "./support.ts";

// Bounds layout draws one box per column and Bounds width keeps each line in its column, whatever lays the text out.
for (const [name, query] of [["root", "cols=2"], ["elements", ""]]) {
    test.describe(name, () => {
        for (const [style, styleQuery] of [["outline-bounds", "type=outline&layout=bounds"], ["highlight-width-bounds", "type=highlight&width=bounds"]]) {
            test(style, async ({ page }) => {
                await page.goto(`/layouts.html?${styleQuery}&${query}`);
                await settle(page);
                // The paginated root lays its columns out in the viewport, so only that is checked.
                await expect(page).toHaveScreenshot(["layouts", name, `${style}.png`], { fullPage: !query, maxDiffPixels: 10 });
            });
        }
    });
}
