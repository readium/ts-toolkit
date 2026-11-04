import { test, expect, type Page } from "@playwright/test";
import { settle, writingModes } from "./support.ts";

/** Points in the viewport inside a decoration's text and on its section's heading, near the viewport's center. */
function targetNearCenter(page: Page) {
    return page.evaluate(() => {
        const center = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
        const inView = ({ x, y }: { x: number; y: number }) => x > 0 && y > 0 && x < innerWidth && y < innerHeight;
        const middle = { x: innerWidth / 2, y: innerHeight / 2 };

        const candidates = Array.from(document.querySelectorAll<HTMLElement>("section[data-group] p")).map(p => {
            const nodes: Text[] = [];
            const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) nodes.push(walker.currentNode as Text);
            const highlight = p.dataset.highlight!;
            let offset = p.textContent!.indexOf(highlight) + Math.floor(highlight.length / 2);
            const node = nodes.find(n => offset < n.length || (offset -= n.length, false))!;
            const range = document.createRange();
            range.setStart(node, offset);
            range.setEnd(node, offset + 1);
            return { id: p.id, inside: center(range.getBoundingClientRect()), outside: center(p.closest("section")!.querySelector("h2")!.getBoundingClientRect()) };
        }).filter(c => inView(c.inside) && inView(c.outside));

        const distance = (c: { inside: { x: number; y: number } }) => Math.hypot(c.inside.x - middle.x, c.inside.y - middle.y);
        return candidates.sort((a, b) => distance(a) - distance(b))[0];
    });
}

for (const mode of [...writingModes, { name: "vertical-rl-positioned", query: "wm=vertical-rl&positioned" }]) {
    for (const scrolled of [false, true]) {
        test(`${mode.name}${scrolled ? " scrolled" : ""}`, async ({ page }) => {
            await page.goto(`/grid.html?type=highlight&activatable&${mode.query}`);
            await settle(page);
            if (scrolled) {
                await page.evaluate(() => {
                    const se = document.scrollingElement!;
                    const writingMode = getComputedStyle(document.documentElement).writingMode;
                    if (!writingMode.startsWith("vertical")) se.scrollTop = (se.scrollHeight - se.clientHeight) / 2;
                    // vertical-rl scrolls towards negative scrollLeft values.
                    else se.scrollLeft = (writingMode === "vertical-rl" ? -1 : 1) * (se.scrollWidth - se.clientWidth) / 2;
                });
                await settle(page);
            }

            const target = await targetNearCenter(page);
            expect(target).toBeDefined();
            const activated = () => page.evaluate(() => window.activatedDecorations);

            await page.mouse.click(target.outside.x, target.outside.y);
            await settle(page);
            expect(await activated()).toEqual([]);

            await page.mouse.click(target.inside.x, target.inside.y);
            await settle(page);
            expect(await activated()).toEqual([target.id]);
        });
    }
}
