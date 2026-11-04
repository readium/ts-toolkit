import { test, expect, type Page } from "@playwright/test";

export const writingModes = [
    { name: "horizontal-tb", query: "wm=horizontal-tb" },
    { name: "vertical-rl", query: "wm=vertical-rl" },
    { name: "vertical-lr", query: "wm=vertical-lr" },
    { name: "rtl", query: "dir=rtl" },
];

export const settle = (page: Page) => page.evaluate(() => (window as Window & { decorationsSettled: () => Promise<void> }).decorationsSettled());

/** Grows the viewport to the whole document, so every case is laid out and rendered without scrolling. */
export async function growToDocument(page: Page) {
    const size = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
    }));
    await page.setViewportSize(size);
    // The decorator redraws 50ms after a resize, which settling alone may not wait for.
    await page.waitForTimeout(100);
    await settle(page);
}

/** Loads a grid and checks one screenshot per layout × width group, cropped to that group's cases. */
export async function expectGroups(page: Page, query: string, path: string[]) {
    await page.goto(`/grid.html?${query}`);
    await settle(page);
    await growToDocument(page);

    const groups = await page.evaluate(() => {
        const vertical = getComputedStyle(document.documentElement).writingMode.startsWith("vertical");
        const { scrollWidth, scrollHeight } = document.documentElement;
        const byGroup = new Map<string, DOMRect[]>();
        for (const section of Array.from(document.querySelectorAll<HTMLElement>("section[data-group]"))) {
            const group = section.dataset.group!;
            byGroup.set(group, [...(byGroup.get(group) ?? []), section.getBoundingClientRect()]);
        }
        // Half the gap between sections, so decorations drawn outside their text stay in the crop.
        const pad = 16;
        return Array.from(byGroup, ([name, rects]) => {
            const start = Math.max(0, Math.min(...rects.map(r => vertical ? r.left : r.top)) - pad);
            const end = Math.max(...rects.map(r => vertical ? r.right : r.bottom)) + pad;
            const clip = vertical
                ? { x: start, y: 0, width: end - start, height: scrollHeight }
                : { x: 0, y: start, width: scrollWidth, height: end - start };
            return { name, clip };
        });
    });

    for (const { name, clip } of groups) {
        await expect.soft(page).toHaveScreenshot([...path, `${name}.png`], { clip, maxDiffPixels: 10 });
    }
}

/** One test per writing mode for a decoration type, each checking all its layout × width groups. */
export function describeType(type: string) {
    test.describe(type, () => {
        for (const mode of writingModes) {
            test(mode.name, async ({ page }) => {
                await expectGroups(page, `type=${type}&${mode.query}`, [type, mode.name]);
            });
        }
    });
}
