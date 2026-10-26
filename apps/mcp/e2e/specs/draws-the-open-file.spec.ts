import type { Page } from "@playwright/test";

import { expect, test } from "../support/fixtures";

test("draws what the file holds and names it in the toolbar", async ({
	page,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc("hello.jis.json", {
		version: 1,
		root: [
			{
				type: "rect",
				id: "r1",
				x: 40,
				y: 40,
				width: 120,
				height: 80,
				text: "hello",
			},
		],
	});

	// The page's Content-Security-Policy refusing something it needs (a font folded
	// in as a data: URL, say) shows up only as a console error, so it is collected
	const policyViolations: string[] = [];
	page.on("console", (message) => {
		if (/Content Security Policy/.test(message.text())) {
			policyViolations.push(message.text());
		}
	});

	await openInViewer(filePath);

	await expect(page.locator('[data-id="r1"]')).toBeVisible();
	await expect(page.locator(".viewer-file-name")).toHaveText("hello.jis.json");
	await expect
		.poll(() => areFontsSettled(page), { timeout: 10_000 })
		.toBe(true);
	expect(policyViolations).toEqual([]);
});

/** Whether every font the page asked for has finished loading or failed to */
const areFontsSettled = (page: Page): Promise<boolean> =>
	page.evaluate(() => document.fonts.ready.then(() => true));
