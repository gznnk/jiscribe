import { selectors } from "@jiscribe/canvas/testing";
import type { Page } from "@playwright/test";

import { expect, expectFileOnDisplay, test } from "../support/fixtures";

/** The ids of the rail's pinned category buttons, in rail order */
const pinnedRailCategoryIds = (page: Page): Promise<string[]> =>
	page
		.locator(selectors.railCategoryButtons("pinned"))
		.evaluateAll((buttons) =>
			buttons.map((button) =>
				(button.getAttribute("data-action") ?? "").replace(/^toggle:/, ""),
			),
		);

test("a category pinned in the page is still pinned after a reload", async ({
	page,
	canvas,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc("pins.jis.json", {
		version: 1,
		root: [],
	});
	await openInViewer(filePath);

	// A fresh browser context holds nothing, so the shape set's default pins show
	await expect.poll(() => pinnedRailCategoryIds(page)).toEqual(["flowchart"]);

	await canvas.openCatalog();
	await page.hover(selectors.catalogRow("uml"));
	await page.locator(selectors.catalogPin("uml")).click();
	await expect
		.poll(() => pinnedRailCategoryIds(page))
		.toEqual(["flowchart", "uml"]);

	await page.reload();
	await expectFileOnDisplay(page, "pins.jis.json");
	await expect
		.poll(() => pinnedRailCategoryIds(page))
		.toEqual(["flowchart", "uml"]);
});
