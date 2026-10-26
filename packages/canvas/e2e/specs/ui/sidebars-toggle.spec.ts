import { test, expect } from "../../fixtures";
import { selectors } from "../../support/selectors";

/**
 * The toolbar's one switch for both sidebars (`sidebarsToggle`, the
 * `toggleSidebars` command).
 *
 * - Pressed collapsed, it opens the shape library and the properties sidebar
 *   together; pressed expanded, it closes both. It carries the expanded state
 *   on aria-expanded.
 * - Expanded means either sidebar is open, so from a mixed state (one opened
 *   through its own toggle) a press closes both rather than leaving one open.
 * - The floating ObjectMenu shows while the sidebars are collapsed and hides
 *   while they are expanded, the properties sidebar then stating what it would.
 * - The two sidebars it opens share one width.
 * - With no shape library declared it moves the properties sidebar alone, and
 *   shows pressed exactly while that one is open.
 */

test.describe("sidebars switch", () => {
	test("opens both sidebars and closes both again, showing pressed while open", async ({
		canvas,
	}) => {
		const sidebarsToggle = canvas.page.locator(selectors.sidebarsToggle);
		const stencilLibraryPanel = canvas.page.locator(
			selectors.stencilLibraryPanel,
		);
		const propertyPanel = canvas.page.locator(selectors.propertyPanel);

		await expect(sidebarsToggle).toHaveAttribute("aria-expanded", "false");
		await expect(stencilLibraryPanel).toHaveCount(0);
		await expect(propertyPanel).toHaveCount(0);

		await canvas.toggleSidebars();
		await expect(sidebarsToggle).toHaveAttribute("aria-expanded", "true");
		await expect(stencilLibraryPanel).toBeVisible();
		await expect(propertyPanel).toBeVisible();

		await canvas.toggleSidebars();
		await expect(sidebarsToggle).toHaveAttribute("aria-expanded", "false");
		await expect(stencilLibraryPanel).toHaveCount(0);
		await expect(propertyPanel).toHaveCount(0);
	});

	test("closes both from a mixed state, where it already shows pressed", async ({
		canvas,
	}) => {
		const sidebarsToggle = canvas.page.locator(selectors.sidebarsToggle);
		await canvas.openStencilLibrary();
		await expect(canvas.page.locator(selectors.propertyPanel)).toHaveCount(0);
		await expect(sidebarsToggle).toHaveAttribute("aria-expanded", "true");

		await canvas.toggleSidebars();

		await expect(
			canvas.page.locator(selectors.stencilLibraryPanel),
		).toHaveCount(0);
		await expect(canvas.page.locator(selectors.propertyPanel)).toHaveCount(0);
		await expect(sidebarsToggle).toHaveAttribute("aria-expanded", "false");
	});

	test("shows the ObjectMenu while collapsed and hides it while expanded", async ({
		canvas,
	}) => {
		// A drawn shape is selected, which is what puts the menu up.
		await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 420, y: 280 });
		const objectMenu = canvas.page.locator(selectors.objectMenu);
		await expect(objectMenu).toBeVisible();

		await canvas.toggleSidebars();
		await expect(canvas.page.locator(selectors.propertyPanel)).toBeVisible();
		await expect(objectMenu).toHaveCount(0);

		await canvas.toggleSidebars();
		await expect(canvas.page.locator(selectors.propertyPanel)).toHaveCount(0);
		await expect(objectMenu).toBeVisible();
	});

	test("gives both sidebars one width", async ({ canvas }) => {
		await canvas.toggleSidebars();
		const libraryBox = await canvas.page
			.locator(selectors.stencilLibraryPanel)
			.boundingBox();
		const propertyBox = await canvas.page
			.locator(selectors.propertyPanel)
			.boundingBox();
		expect(libraryBox).not.toBeNull();
		expect(propertyBox).not.toBeNull();
		expect(libraryBox?.width).toBe(propertyBox?.width);
	});

	test("with no shape library, follows the properties sidebar alone", async ({
		canvas,
	}) => {
		await canvas.goto("?noStencilLibrary");
		const sidebarsToggle = canvas.page.locator(selectors.sidebarsToggle);
		const propertyPanel = canvas.page.locator(selectors.propertyPanel);

		await canvas.toggleSidebars();
		await expect(propertyPanel).toBeVisible();
		await expect(
			canvas.page.locator(selectors.stencilLibraryPanel),
		).toHaveCount(0);

		// Closed from its own button, the switch has nothing left open to show.
		await canvas.closePropertyPanel();
		await expect(sidebarsToggle).toHaveAttribute("aria-expanded", "false");

		// So the next press opens it again rather than closing an undrawn library.
		await canvas.toggleSidebars();
		await expect(propertyPanel).toBeVisible();
		await expect(sidebarsToggle).toHaveAttribute("aria-expanded", "true");
	});
});
