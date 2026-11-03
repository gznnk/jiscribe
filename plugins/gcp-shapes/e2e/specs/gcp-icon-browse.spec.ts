import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * Which icon a gcpIcon draws is chosen by the stencil it is placed from:
 * the shape library's "show all" view lays out the whole set, in sections
 * that each gather related Google Cloud categories.
 */

const CATEGORY = "gcp";

/** An icon outside the palette, filed under Other, so neither the palette nor Compute lists it. */
const COLLABORATION_PRESET = "gcpIconCollaboration";
const COLLABORATION_LABEL = "Collaboration";

test.describe("the Google Cloud show all view", () => {
	test("places an icon from beyond the palette, drawn with that icon", async ({
		canvas,
	}) => {
		await canvas.openStencilLibrary();
		const item = canvas.page.locator(
			selectors.stencilLibraryPanelItem(COLLABORATION_PRESET),
		);
		await expect(item).toHaveCount(0);

		await canvas.page.click(selectors.stencilLibraryShowAll(CATEGORY));
		await expect(
			canvas.page.locator(selectors.stencilLibraryBrowseGroup("compute")),
		).toHaveAttribute("aria-expanded", "true");
		const other = canvas.page.locator(
			selectors.stencilLibraryBrowseGroup("other"),
		);
		await expect(other).toHaveAttribute("aria-expanded", "false");

		await other.click();
		await expect(item).toBeVisible();
		// The item's glyph draws the same asset the shape does.
		const collaborationArt = await item
			.locator("path")
			.first()
			.getAttribute("d");

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
			.toBe(collaborationArt);
		await expect
			.poll(async () =>
				(await canvas.drawnTextRuns(createdId)).map((run) => run.text),
			)
			.toEqual([COLLABORATION_LABEL]);
	});

	test("finds an icon through its short name", async ({ canvas }) => {
		await canvas.openStencilLibrary();
		await canvas.page.fill(selectors.stencilLibrarySearch, "gce");

		await expect(
			canvas.page.locator(
				selectors.stencilLibraryPanelItem("gcpIconComputeEngine"),
			),
		).toBeVisible();
	});
});
