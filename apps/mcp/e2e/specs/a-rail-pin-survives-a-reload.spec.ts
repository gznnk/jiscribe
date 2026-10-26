import { selectors } from "@jiscribe/canvas/testing";
import { standardDefaultPinnedCategoryIds } from "@jiscribe/standard-shapes";
import type { Page } from "@playwright/test";

import { expect, expectFileOnDisplay, test } from "../support/fixtures";

/** The ids of the rail's pinned category buttons, in rail order */
const pinnedRailCategoryIds = (page: Page): Promise<string[]> =>
	page
		.locator(selectors.railCategoryButtons)
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

	// A category the default pins leave out, so pinning it is a change
	const addedCategoryId = "uml";
	expect(standardDefaultPinnedCategoryIds).not.toContain(addedCategoryId);
	const changedPinnedCategoryIds = [
		...standardDefaultPinnedCategoryIds,
		addedCategoryId,
	];

	// A fresh browser context holds nothing, so the shape set's default pins show
	await expect
		.poll(() => pinnedRailCategoryIds(page))
		.toEqual([...standardDefaultPinnedCategoryIds]);

	await canvas.openCatalog();
	await page.hover(selectors.catalogRow(addedCategoryId));
	await page.locator(selectors.catalogPin(addedCategoryId)).click();
	await expect
		.poll(() => pinnedRailCategoryIds(page))
		.toEqual(changedPinnedCategoryIds);

	await page.reload();
	await expectFileOnDisplay(page, "pins.jis.json");
	await expect
		.poll(() => pinnedRailCategoryIds(page))
		.toEqual(changedPinnedCategoryIds);
});
