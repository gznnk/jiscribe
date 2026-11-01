import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * Which icon a lucideIcon draws is chosen by the stencil it is placed from: the
 * shape library's "show all" view lays out the whole set in one section by
 * name, and a placed shape offers no menu or sidebar row to change it.
 */

const CATEGORY = "icon";
const GROUP = "all";

/** Off the flyout's shortlist, and early in the alphabet, so in the first batch drawn. */
const ANCHOR_PRESET = "lucideIconAnchor";

/** Last of the set by name, so drawn only once the batches reach the end. */
const LAST_PRESET = "lucideIconZoomOut";

test.describe("the icon show all view", () => {
	test("places an icon from beyond the flyout, drawn with that icon", async ({
		canvas,
	}) => {
		await canvas.openStencilLibrary();
		const item = canvas.page.locator(
			selectors.stencilLibraryPanelItem(ANCHOR_PRESET),
		);
		await expect(item).toHaveCount(0);

		await canvas.page.click(selectors.stencilLibraryShowAll(CATEGORY));
		await expect(
			canvas.page.locator(selectors.stencilLibraryBrowseGroup(GROUP)),
		).toHaveAttribute("aria-expanded", "true");
		await expect(item).toBeVisible();
		// The item's glyph draws the same icon the shape does
		const anchorArt = await item.locator("path").first().getAttribute("d");

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
			.toBe(anchorArt);
	});

	test("draws the set in batches as the list scrolls, down to its last icon", async ({
		canvas,
	}) => {
		await canvas.openStencilLibrary();
		await canvas.page.click(selectors.stencilLibraryShowAll(CATEGORY));
		const items = canvas.page.locator(
			`${selectors.stencilLibraryPanel} [data-action^="item:"]`,
		);
		await expect(
			canvas.page.locator(
				selectors.stencilLibraryPanelItem("lucideIconAArrowDown"),
			),
		).toBeVisible();
		const firstCount = await items.count();
		expect(firstCount).toBeLessThan(1767);

		const last = canvas.page.locator(
			selectors.stencilLibraryPanelItem(LAST_PRESET),
		);
		const list = canvas.page.locator(
			`${selectors.stencilLibraryPanel} input[type="text"] >> xpath=../following-sibling::*[1]`,
		);
		await expect
			.poll(
				async () => {
					await list.evaluate((element) => {
						element.scrollTop = element.scrollHeight;
					});
					return last.count();
				},
				{ message: "scrolling to the end draws the last icon" },
			)
			.toBe(1);
		expect(await items.count()).toBe(1767);
	});
});

test.describe("a placed icon", () => {
	test("offers no icon in the ObjectMenu", async ({ canvas }) => {
		await canvas.placeShapeFromFlyout(CATEGORY, "lucideIconUser");

		const menu = canvas.page.locator(selectors.objectMenu);
		await expect(menu).toBeVisible();
		await expect(
			menu.locator(selectors.objectMenuToggle("lucide-icon")),
		).toHaveCount(0);
		await expect(menu.locator('[data-action^="set:icon:"]')).toHaveCount(0);
	});

	test("offers no icon in the properties sidebar, which leads with Layout", async ({
		canvas,
	}) => {
		await canvas.openPropertyPanel();
		await canvas.placeShapeFromFlyout(CATEGORY, "lucideIconUser");

		await expect(
			canvas.page.locator(selectors.propertyPanelSection("layout")),
		).toBeVisible();
		await expect(
			canvas.page.locator(selectors.propertyPanelSection("lucideIcon")),
		).toHaveCount(0);
		const sectionIds = await canvas.page
			.locator(`${selectors.propertyPanel} [data-action^="toggle:"]`)
			.evaluateAll((toggles) =>
				toggles.map((toggle) => toggle.getAttribute("data-action")),
			);
		expect(sectionIds[0]).toBe("toggle:layout");
	});
});
