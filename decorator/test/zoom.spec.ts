import { test } from "@playwright/test";
import { expectGroups } from "./support.ts";

// Zoom is only compensated for in Blink.
test.describe("zoom 2", { tag: "@blink" }, () => {
    for (const type of ["underline", "strikethrough", "outline"]) {
        test(type, async ({ page }) => {
            await expectGroups(page, `type=${type}&zoom=2`, ["zoom-2", type]);
        });
    }
});
