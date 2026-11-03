import { test, expect } from "@playwright/test";
import { settle, writingModes } from "./support.ts";

// The viewport is scrolled halfway, so decorations are positioned with non-zero scroll offsets.
for (const type of ["outline", "mask"]) {
    test.describe(type, () => {
        for (const mode of writingModes) {
            test(mode.name, async ({ page }) => {
                await page.goto(`/grid.html?type=${type}&${mode.query}`);
                await settle(page);
                await page.evaluate(() => {
                    const se = document.scrollingElement!;
                    const writingMode = getComputedStyle(document.documentElement).writingMode;
                    if (!writingMode.startsWith("vertical")) se.scrollTop = (se.scrollHeight - se.clientHeight) / 2;
                    // vertical-rl scrolls towards negative scrollLeft values.
                    else se.scrollLeft = (writingMode === "vertical-rl" ? -1 : 1) * (se.scrollWidth - se.clientWidth) / 2;
                });
                await settle(page);
                await expect(page).toHaveScreenshot(["scroll", type, `${mode.name}.png`], { maxDiffPixels: 10 });
            });
        }
    });
}
