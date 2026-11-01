import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * Which icon an awsIcon draws is chosen by the stencil it is placed from: the
 * shape library's "show all" view lays out the whole set, sectioned by AWS
 * category, and a placed shape offers no menu or sidebar row to change it.
 */

const CATEGORY = "aws";
const S3_PRESET = "awsIconServiceAmazonSimpleStorageService";

/** A Storage icon outside tier 1, so neither the palette nor Compute lists it. */
const SNAPSHOT_PRESET = "awsIconResourceAmazonElasticBlockStoreSnapshot";
const SNAPSHOT_LABEL = "Amazon Elastic Block Store / Snapshot";

test.describe("the AWS show all view", () => {
	test("places an icon from beyond the palette, drawn with that icon", async ({
		canvas,
	}) => {
		await canvas.openStencilLibrary();
		const item = canvas.page.locator(
			selectors.stencilLibraryPanelItem(SNAPSHOT_PRESET),
		);
		await expect(item).toHaveCount(0);

		await canvas.page.click(selectors.stencilLibraryShowAll(CATEGORY));
		await expect(
			canvas.page.locator(selectors.stencilLibraryBrowseGroup("compute")),
		).toHaveAttribute("aria-expanded", "true");
		const storage = canvas.page.locator(
			selectors.stencilLibraryBrowseGroup("storage"),
		);
		await expect(storage).toHaveAttribute("aria-expanded", "false");
		await expect(item).toHaveCount(0);

		await storage.click();
		await expect(item).toBeVisible();
		// The item's glyph draws the same asset the shape does, so seeing it on
		// the shape is what says the shape draws that icon.
		const snapshotArt = await item.locator("path").first().getAttribute("d");

		const before = await canvas.captureObjects();
		await item.click();
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(before.length + 1);
		const created = (await canvas.captureObjects()).find(
			(object) => !before.some((old) => old.id === object.id),
		);
		const createdId = created?.id;
		if (!createdId) {
			throw new Error("cannot read the data-id of the placed icon");
		}

		await expect
			.poll(async () =>
				canvas.objectById(createdId).locator("path").first().getAttribute("d"),
			)
			.toBe(snapshotArt);
		await expect
			.poll(async () =>
				(await canvas.drawnTextRuns(createdId)).map((run) => run.text),
			)
			.toEqual([SNAPSHOT_LABEL]);
	});
});

test.describe("a placed AWS icon", () => {
	test("offers no icon in the ObjectMenu", async ({ canvas }) => {
		await canvas.placeShapeFromFlyout(CATEGORY, S3_PRESET);

		const menu = canvas.page.locator(selectors.objectMenu);
		await expect(menu).toBeVisible();
		await expect(
			menu.locator(selectors.objectMenuToggle("aws-icon")),
		).toHaveCount(0);
		await expect(menu.locator('[data-action^="set:icon:"]')).toHaveCount(0);
	});

	test("offers no icon in the properties sidebar, which leads with Layout", async ({
		canvas,
	}) => {
		await canvas.openPropertyPanel();
		await canvas.placeShapeFromFlyout(CATEGORY, S3_PRESET);

		await expect(
			canvas.page.locator(selectors.propertyPanelSection("layout")),
		).toBeVisible();
		await expect(
			canvas.page.locator(selectors.propertyPanelSection("awsIcon")),
		).toHaveCount(0);
		const sectionIds = await canvas.page
			.locator(`${selectors.propertyPanel} [data-action^="toggle:"]`)
			.evaluateAll((toggles) =>
				toggles.map((toggle) => toggle.getAttribute("data-action")),
			);
		expect(sectionIds[0]).toBe("toggle:layout");
	});
});
