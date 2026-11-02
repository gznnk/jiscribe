import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { Page } from "@playwright/test";

/**
 * Which icon a lucideIcon draws is chosen by the stencil it is placed from: the
 * shape library's "show all" view lays out the whole set in sections, one per
 * lucide category, and a placed shape offers no menu or sidebar row to change it.
 */

const CATEGORY = "icon";

/** The first section, the only one expanded on entering the view. */
const FIRST_GROUP = "account";

/** Off the flyout's shortlist, and second in the first section, so in its first batch drawn. */
const AT_SIGN_PRESET = "lucideIconAtSign";

/**
 * In devices, development and gaming, and early enough in the first two to be in
 * their first batch; off the flyout's shortlist.
 */
const COMPUTER_PRESET = "lucideIconComputer";

/** A section of 261 icons, more than one batch; its items are looked up inside the section. */
const BATCHED_GROUP = "text";

/** Last of the batched section by name, so drawn only once its batches reach the end. */
const BATCHED_GROUP_LAST_PRESET = "lucideIconZoomOut";

const BATCHED_GROUP_SIZE = 261;

/**
 * One section of the "show all" view: the header the test id sits on, and the
 * element wrapping it and its grid. An icon in several categories is drawn in
 * each section, so items are looked up within a section.
 */
const browseGroup = (page: Page, groupId: string) => {
	const header = page.locator(selectors.stencilLibraryBrowseGroup(groupId));
	const section = header.locator("xpath=..");
	return {
		header,
		item: (presetId: string) =>
			section.locator(`[data-action="item:${presetId}"]`),
		items: section.locator('[data-action^="item:"]'),
	};
};

test.describe("the icon show all view", () => {
	test("opens on the first category alone", async ({ canvas }) => {
		await canvas.openStencilLibrary();
		await canvas.page.click(selectors.stencilLibraryShowAll(CATEGORY));

		const headers = canvas.page.locator(
			`${selectors.stencilLibraryPanel} [data-testid^="stencil-library-browse-group-"]`,
		);
		await expect(headers).toHaveCount(42);
		await expect(headers.first()).toHaveAttribute(
			"data-testid",
			`stencil-library-browse-group-${FIRST_GROUP}`,
		);
		const expandedStates = await headers.evaluateAll((elements) =>
			elements.map((element) => element.getAttribute("aria-expanded")),
		);
		expect(expandedStates[0]).toBe("true");
		expect(expandedStates.slice(1).every((state) => state === "false")).toBe(
			true,
		);
	});

	test("places an icon from beyond the flyout, drawn with that icon", async ({
		canvas,
	}) => {
		await canvas.openStencilLibrary();
		await expect(
			canvas.page.locator(selectors.stencilLibraryPanelItem(AT_SIGN_PRESET)),
		).toHaveCount(0);

		await canvas.page.click(selectors.stencilLibraryShowAll(CATEGORY));
		const firstGroup = browseGroup(canvas.page, FIRST_GROUP);
		await expect(firstGroup.header).toHaveAttribute("aria-expanded", "true");
		const item = firstGroup.item(AT_SIGN_PRESET);
		await expect(item).toBeVisible();
		// The item's glyph draws the same icon the shape does
		const atSignArt = await item.locator("path").first().getAttribute("d");

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
			.toBe(atSignArt);
	});

	test("shows an icon in every category it belongs to", async ({ canvas }) => {
		await canvas.openStencilLibrary();
		await canvas.page.click(selectors.stencilLibraryShowAll(CATEGORY));
		const devices = browseGroup(canvas.page, "devices");
		const development = browseGroup(canvas.page, "development");
		await devices.header.click();
		await development.header.click();

		await expect(devices.item(COMPUTER_PRESET)).toHaveCount(1);
		await expect(development.item(COMPUTER_PRESET)).toHaveCount(1);

		const item = development.item(COMPUTER_PRESET);
		const computerArt = await item.locator("path").first().getAttribute("d");
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
			.toBe(computerArt);
	});

	test("draws a section in batches as the list scrolls, down to its last icon", async ({
		canvas,
	}) => {
		await canvas.openStencilLibrary();
		await canvas.page.click(selectors.stencilLibraryShowAll(CATEGORY));
		const batchedGroup = browseGroup(canvas.page, BATCHED_GROUP);
		await batchedGroup.header.click();
		await expect(batchedGroup.header).toHaveAttribute("aria-expanded", "true");
		await expect(batchedGroup.item("lucideIconAArrowDown")).toBeVisible();
		const firstCount = await batchedGroup.items.count();
		expect(firstCount).toBeLessThan(BATCHED_GROUP_SIZE);

		const last = batchedGroup.item(BATCHED_GROUP_LAST_PRESET);
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
				{ message: "scrolling to the end draws the section's last icon" },
			)
			.toBe(1);
		expect(await batchedGroup.items.count()).toBe(BATCHED_GROUP_SIZE);
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
