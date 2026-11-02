import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * Which icon an azureIcon draws is chosen by the stencil it is placed from:
 * the shape library's "show all" view lays out the whole set, sectioned by
 * Azure category.
 */

const CATEGORY = "azure";

/** A Networking icon outside the palette, so neither the palette nor Compute lists it. */
const RESOLVER_PRESET = "azureIconDnsPrivateResolver";
const RESOLVER_LABEL = "DNS Private Resolver";

test.describe("the Azure show all view", () => {
	test("places an icon from beyond the palette, drawn with that icon", async ({
		canvas,
	}) => {
		await canvas.openStencilLibrary();
		const item = canvas.page.locator(
			selectors.stencilLibraryPanelItem(RESOLVER_PRESET),
		);
		await expect(item).toHaveCount(0);

		await canvas.page.click(selectors.stencilLibraryShowAll(CATEGORY));
		await expect(
			canvas.page.locator(selectors.stencilLibraryBrowseGroup("compute")),
		).toHaveAttribute("aria-expanded", "true");
		const networking = canvas.page.locator(
			selectors.stencilLibraryBrowseGroup("networking"),
		);
		await expect(networking).toHaveAttribute("aria-expanded", "false");

		await networking.click();
		await expect(item).toBeVisible();
		// The item's glyph draws the same asset the shape does.
		const resolverArt = await item.locator("path").first().getAttribute("d");

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
			.toBe(resolverArt);
		await expect
			.poll(async () =>
				(await canvas.drawnTextRuns(createdId)).map((run) => run.text),
			)
			.toEqual([RESOLVER_LABEL]);
	});

	test("finds an icon through its short name", async ({ canvas }) => {
		await canvas.openStencilLibrary();
		await canvas.page.fill(selectors.stencilLibrarySearch, "aks");

		await expect(
			canvas.page.locator(
				selectors.stencilLibraryPanelItem("azureIconKubernetesServices"),
			),
		).toBeVisible();
	});
});
