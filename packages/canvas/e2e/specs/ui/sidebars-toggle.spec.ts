import { test, expect } from "../../fixtures";
import { selectors } from "../../support/selectors";

/**
 * The toolbar's one switch for both sidebars (`sidebarsToggle`, the
 * `toggleSidebars` command), which switches the chrome between its two forms.
 *
 * - It alone collapses the chrome, and carries the form on aria-expanded.
 *   Expanding brings back the panels the user left open, or both when that was
 *   neither.
 * - A panel's own close button, or its per-sidebar toggle, moves that panel
 *   within the expanded form: closing both leaves the full-width bar with no
 *   panel, and no stencil bar or ObjectMenu.
 * - A per-sidebar toggle pressed while collapsed (the harness keeps one in each
 *   pill) expands with that panel alone open.
 * - The floating ObjectMenu shows while collapsed and hides while expanded,
 *   whether or not the properties sidebar is open.
 * - The two sidebars it opens share one width.
 * - A page declaring no shape library gets the default one: one section
 *   listing the first registered presets, whose search reaches every one.
 */

test.describe("sidebars switch", () => {
	test("expands with both sidebars and collapses again, showing the form on aria-expanded", async ({
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

	test("stays expanded with the full-width bar and no stencil bar or ObjectMenu once both panels are closed from their ×", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 420, y: 280 });
		await canvas.toggleSidebars();

		await canvas.closeStencilLibrary();
		await canvas.closePropertyPanel();

		await expect(canvas.page.locator(selectors.sidebarsToggle)).toHaveAttribute(
			"aria-expanded",
			"true",
		);
		// One element carrying the bar's data-id: the full-width bar, not the pills.
		await expect(canvas.page.locator(selectors.toolbar)).toHaveCount(1);
		await expect(
			canvas.page.locator('[data-testid^="toolbar-pill:"]'),
		).toHaveCount(0);
		await expect(canvas.page.locator(selectors.stencilBar)).toHaveCount(0);
		await expect(canvas.page.locator(selectors.objectMenu)).toHaveCount(0);
	});

	test("brings back the panel left open when it expands again", async ({
		canvas,
	}) => {
		await canvas.toggleSidebars();
		await canvas.closeStencilLibrary();

		await canvas.toggleSidebars();
		await expect(canvas.page.locator(selectors.propertyPanel)).toHaveCount(0);

		await canvas.toggleSidebars();
		await expect(canvas.page.locator(selectors.propertyPanel)).toBeVisible();
		await expect(
			canvas.page.locator(selectors.stencilLibraryPanel),
		).toHaveCount(0);
	});

	test("opens both when it expands from a layout with both closed", async ({
		canvas,
	}) => {
		await canvas.toggleSidebars();
		await canvas.closeStencilLibrary();
		await canvas.closePropertyPanel();
		await canvas.toggleSidebars();

		await canvas.toggleSidebars();
		await expect(
			canvas.page.locator(selectors.stencilLibraryPanel),
		).toBeVisible();
		await expect(canvas.page.locator(selectors.propertyPanel)).toBeVisible();
	});

	test("hides the ObjectMenu while expanded, the properties sidebar open or not", async ({
		canvas,
	}) => {
		// A drawn shape is selected, which is what puts the menu up.
		await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 420, y: 280 });
		const objectMenu = canvas.page.locator(selectors.objectMenu);
		await expect(objectMenu).toBeVisible();

		await canvas.toggleSidebars();
		await expect(canvas.page.locator(selectors.propertyPanel)).toBeVisible();
		await expect(objectMenu).toHaveCount(0);

		// Collapsed, the properties sidebar is kept open for the next expand.
		await canvas.toggleSidebars();
		await expect(objectMenu).toBeVisible();

		await canvas.toggleSidebars();
		await canvas.closePropertyPanel();
		await expect(objectMenu).toHaveCount(0);
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

	test("shows the default library, one section searching every registered preset, when the page declares none", async ({
		canvas,
	}) => {
		await canvas.goto("?noStencilLibrary");
		await canvas.toggleSidebars();

		const libraryPanel = canvas.page.locator(selectors.stencilLibraryPanel);
		await expect(libraryPanel).toBeVisible();
		await expect(libraryPanel.locator('[data-action^="section:"]')).toHaveCount(
			1,
		);
		await expect(
			canvas.page.locator(selectors.stencilLibrarySection("allShapes")),
		).toHaveText(/All shapes/);
		// Core's primitives and the spec plugin's presets, none of them declared
		// in a section on this page.
		for (const presetId of ["rect", "text", "pin", "memo"]) {
			await expect(
				canvas.page.locator(selectors.stencilLibraryPanelItem(presetId)),
			).toBeVisible();
		}
		// The section caps what it lists, so it points to the search, which
		// reaches every registered preset.
		await expect(
			libraryPanel.getByRole("button", { name: "Find more shapes" }),
		).toHaveCount(1);
		await canvas.page.locator(selectors.stencilLibrarySearch).fill("memo");
		await expect(libraryPanel.locator('[data-action^="item:"]')).toHaveCount(1);
		await expect(
			canvas.page.locator(selectors.stencilLibraryPanelItem("memo")),
		).toBeVisible();
	});
});

/** A declared library resolving to no section is still a library, drawn empty. */
test.describe("declared empty shape library", () => {
	test("keeps the library toggle and opens an empty sidebar", async ({
		canvas,
	}) => {
		await canvas.goto("?emptyStencilLibrary");
		await expect(
			canvas.page.locator(selectors.stencilLibraryToggle),
		).toBeVisible();

		await canvas.openStencilLibrary();
		const libraryPanel = canvas.page.locator(selectors.stencilLibraryPanel);
		await expect(libraryPanel.locator('[data-action^="section:"]')).toHaveCount(
			0,
		);
		await expect(libraryPanel.locator('[data-action^="item:"]')).toHaveCount(0);
	});
});

/**
 * The harness keeps a toggle for each sidebar in the collapsed pills, where a
 * press is the one way besides the switch to expand.
 */
test.describe("per-sidebar toggle pressed while collapsed", () => {
	/** Collapsing keeps both panels' flags open, but neither panel is drawn. */
	test("reads not pressed while collapsed, whatever the panel's kept flag", async ({
		canvas,
	}) => {
		await canvas.toggleSidebars();
		const libraryToggle = canvas.page.locator(selectors.stencilLibraryToggle);
		const propertiesToggle = canvas.page.locator(selectors.propertyPanelToggle);
		await expect(libraryToggle).toHaveAttribute("aria-expanded", "true");
		await expect(propertiesToggle).toHaveAttribute("aria-expanded", "true");

		await canvas.toggleSidebars();
		await expect(libraryToggle).toHaveAttribute("aria-expanded", "false");
		await expect(propertiesToggle).toHaveAttribute("aria-expanded", "false");
	});

	test("expands with the shape library alone open", async ({ canvas }) => {
		await canvas.openStencilLibrary();
		await expect(canvas.page.locator(selectors.sidebarsToggle)).toHaveAttribute(
			"aria-expanded",
			"true",
		);
		await expect(canvas.page.locator(selectors.propertyPanel)).toHaveCount(0);
	});

	test("expands with the properties sidebar alone, over the layout last left open", async ({
		canvas,
	}) => {
		await canvas.toggleSidebars();
		await canvas.toggleSidebars();

		await canvas.openPropertyPanel();
		await expect(
			canvas.page.locator(selectors.stencilLibraryPanel),
		).toHaveCount(0);
		await expect(canvas.page.locator(selectors.sidebarsToggle)).toHaveAttribute(
			"aria-expanded",
			"true",
		);
	});
});

/**
 * The toggles for one sidebar each, which the default bar puts just before the
 * switch (`DEFAULT_TOOLBAR_PER_SIDEBAR_TOGGLES_SECTION`). The page's own bar
 * keeps them elsewhere, so these run on the canvas default (?defaultToolbar).
 */
test.describe("per-sidebar toggles on the default bar", () => {
	test("are left out of the collapsed pills, beside the switch", async ({
		canvas,
	}) => {
		await canvas.goto("?defaultToolbar");
		await expect(canvas.page.locator(selectors.sidebarsToggle)).toBeVisible();
		await expect(
			canvas.page.locator(selectors.stencilLibraryToggle),
		).toHaveCount(0);
		await expect(
			canvas.page.locator(selectors.propertyPanelToggle),
		).toHaveCount(0);
	});

	test("reopen the one sidebar closed from its own ×, in one press", async ({
		canvas,
	}) => {
		await canvas.goto("?defaultToolbar");
		await canvas.toggleSidebars();
		const libraryToggle = canvas.page.locator(selectors.stencilLibraryToggle);
		const propertiesToggle = canvas.page.locator(selectors.propertyPanelToggle);
		await expect(libraryToggle).toHaveAttribute("aria-expanded", "true");
		await expect(propertiesToggle).toHaveAttribute("aria-expanded", "true");

		await canvas.closeStencilLibrary();
		await expect(libraryToggle).toHaveAttribute("aria-expanded", "false");
		await expect(propertiesToggle).toHaveAttribute("aria-expanded", "true");

		await canvas.openStencilLibrary();
		await expect(libraryToggle).toHaveAttribute("aria-expanded", "true");
		await expect(canvas.page.locator(selectors.propertyPanel)).toBeVisible();
	});

	test("include the library toggle when the page declares no library", async ({
		canvas,
	}) => {
		await canvas.goto("?noStencilLibrary&defaultToolbar");
		await canvas.toggleSidebars();
		await expect(
			canvas.page.locator(selectors.stencilLibraryToggle),
		).toHaveAttribute("aria-expanded", "true");
		await expect(
			canvas.page.locator(selectors.stencilLibraryPanel),
		).toBeVisible();
	});
});
