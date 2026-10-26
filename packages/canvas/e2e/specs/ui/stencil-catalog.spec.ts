import { test, expect } from "../../fixtures";
import { selectors } from "../../support/selectors";

/**
 * The catalog: the panel the rail's catalog button opens, listing every section of
 * `stencilLibrary.sections`.
 *
 * - The button toggles it, carrying the shown state on aria-expanded; its search
 *   box is not focused on opening.
 * - Its search finds shapes across every category — including presets a category
 *   holds beyond the ones it lists, through its `search` — and the result places
 *   a shape like any library item.
 * - A row switches the panel to its category, whose own search box and "find
 *   more" button reach the rest of that category.
 * - A row's pin toggle puts the category on the rail and takes it off again.
 * - Its grid of shapes lines up with the search box above it, first column to
 *   last.
 *
 * The categories are core's `basic` section and the harness's test-only `spec`
 * and `spare` ones (e2e/plugins/specShapesPlugin): `spec` lists `tile` and holds
 * `brick` beyond it, and the harness pins it; `spare` lists `memo`.
 */

const SPEC_CATEGORY = "spec";
const BASIC_CATEGORY = "basic";
const SPARE_CATEGORY = "spare";

test.describe("Stencil catalog", () => {
	test("opens and closes from the rail's catalog button, its search box unfocused", async ({
		canvas,
	}) => {
		const button = canvas.page.locator(selectors.catalogButton);
		const flyout = canvas.page.locator(selectors.stencilFlyout);
		await expect(flyout).toHaveCount(0);
		await expect(button).toHaveAttribute("aria-expanded", "false");
		// The label is the toggleStencilLibrary command's own.
		await expect(button).toHaveAttribute("title", "Find Shapes");

		await button.click();
		await expect(flyout).toBeVisible();
		await expect(button).toHaveAttribute("aria-expanded", "true");
		await expect(
			canvas.page.locator(selectors.stencilPanelSearch),
		).not.toBeFocused();
		// Every section, in declaration order, one flat row each.
		const rowActions = await flyout
			.locator('[data-action^="show:"]')
			.evaluateAll((rows) =>
				rows.map((row) => row.getAttribute("data-action")),
			);
		expect(rowActions).toEqual([
			`show:${BASIC_CATEGORY}`,
			`show:${SPEC_CATEGORY}`,
			`show:${SPARE_CATEGORY}`,
		]);

		await button.click();
		await expect(flyout).toHaveCount(0);
	});

	test("places a shape found through its search", async ({ canvas }) => {
		await canvas.openCatalog();
		const search = canvas.page.locator(selectors.stencilPanelSearch);

		// A match leaves the matching shapes in one grid, the rows gone
		await search.fill("ellip");
		const ellipseItem = canvas.page.locator(
			selectors.stencilPanelItem("ellipse"),
		);
		await expect(ellipseItem).toBeVisible();
		await expect(
			canvas.page.locator(selectors.catalogRow(BASIC_CATEGORY)),
		).toHaveCount(0);

		const before = (await canvas.captureObjects()).length;
		await ellipseItem.click();
		await expect
			.poll(() => canvas.isDrawingMode(), {
				message: "clicking a search result enters drawing mode",
			})
			.toBe(true);
		// Picking it closed the flyout, like any preset picked from one.
		await expect(canvas.page.locator(selectors.stencilFlyout)).toHaveCount(0);
		await canvas.drag({ x: 360, y: 240 }, { x: 520, y: 360 });
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "the found shape is drawn",
			})
			.toBe(before + 1);
	});

	test("reaches a preset a category does not list, and says when nothing matches", async ({
		canvas,
	}) => {
		await canvas.openCatalog();
		const search = canvas.page.locator(selectors.stencilPanelSearch);

		await search.fill("brick");
		await expect(
			canvas.page.locator(selectors.stencilPanelItem("brick")),
		).toBeVisible();

		await search.fill("no-such-shape");
		await expect(
			canvas.page
				.locator(selectors.stencilPanel)
				.getByText("No matching shapes"),
		).toBeVisible();

		// Clearing the query brings the rows back
		await search.fill("");
		await expect(
			canvas.page.locator(selectors.catalogRow(SPEC_CATEGORY)),
		).toBeVisible();
	});

	test("switches to a category from its row, whose search reaches the rest of it", async ({
		canvas,
	}) => {
		await canvas.openCatalog();
		await canvas.page.click(selectors.catalogRow(SPEC_CATEGORY));

		await expect(
			canvas.page.locator(selectors.categoryPanel(SPEC_CATEGORY)),
		).toBeVisible();
		const tileItem = canvas.page.locator(selectors.stencilPanelItem("tile"));
		const brickItem = canvas.page.locator(selectors.stencilPanelItem("brick"));
		await expect(tileItem).toBeVisible();
		// Unlisted, so the browsing view does not show it
		await expect(brickItem).toHaveCount(0);
		// The rail tells which panel is shown.
		await expect(
			canvas.page.locator(selectors.categoryButton(SPEC_CATEGORY)),
		).toHaveAttribute("aria-expanded", "true");
		await expect(canvas.page.locator(selectors.catalogButton)).toHaveAttribute(
			"aria-expanded",
			"false",
		);

		// The category declares `search`, so it points to the box
		const search = canvas.page.locator(selectors.stencilPanelSearch);
		await canvas.page
			.locator(selectors.stencilPanel)
			.getByRole("button", { name: "Find more shapes" })
			.click();
		await expect(search).toBeFocused();

		await search.fill("brick");
		await expect(brickItem).toBeVisible();
		await expect(tileItem).toHaveCount(0);
		// Scoped to the category: a basic shape is not found from here.
		await search.fill("rect");
		await expect(
			canvas.page.locator(selectors.stencilPanelItem("rect")),
		).toHaveCount(0);
	});

	test("pins a category to the rail from its row, and unpins it", async ({
		canvas,
	}) => {
		const basicButton = canvas.page.locator(
			selectors.categoryButton(BASIC_CATEGORY),
		);
		await expect(basicButton).toHaveCount(0);

		await canvas.openCatalog();
		const basicPin = canvas.page.locator(selectors.catalogPin(BASIC_CATEGORY));
		const specPin = canvas.page.locator(selectors.catalogPin(SPEC_CATEGORY));
		await expect(basicPin).toHaveAttribute("aria-pressed", "false");
		await expect(specPin).toHaveAttribute("aria-pressed", "true");
		// Every row has one, so each names its own category.
		await expect(basicPin).toHaveAttribute("aria-label", "Pin Basic");
		await expect(specPin).toHaveAttribute("aria-label", "Pin Spec");
		// An unpinned row shows its pin only on hover; a pinned one always.
		await canvas.page.mouse.move(0, 0);
		await expect(specPin).toHaveCSS("opacity", "1");
		await expect(basicPin).toHaveCSS("opacity", "0");

		// Hovered, an unpinned row hints its pin faintly, so pinning it shows.
		await canvas.page.hover(selectors.catalogRow(BASIC_CATEGORY));
		await expect(basicPin).toHaveCSS("opacity", "0.4");
		await basicPin.click();
		await expect(basicPin).toHaveAttribute("aria-pressed", "true");
		await expect(basicPin).toHaveCSS("opacity", "1");
		await expect(basicButton).toBeVisible();
		// Appended after the existing pin.
		const railCategories = await canvas.page
			.locator(`${selectors.rail} [data-id="stencil-category"]`)
			.evaluateAll((buttons) =>
				buttons.map((button) => button.getAttribute("data-action")),
			);
		expect(railCategories).toEqual([
			`toggle:${SPEC_CATEGORY}`,
			`toggle:${BASIC_CATEGORY}`,
		]);
		// Pinning leaves the catalog open.
		await expect(canvas.page.locator(selectors.stencilFlyout)).toBeVisible();

		await basicPin.click();
		await expect(basicPin).toHaveAttribute("aria-pressed", "false");
		await expect(basicButton).toHaveCount(0);
		await expect(basicPin).toHaveCSS("opacity", "0.4");
		// The click left the focus on the toggle; once the pointer goes, no pin stays.
		await canvas.page.mouse.move(0, 0);
		await expect(basicPin).toHaveCSS("opacity", "0");
	});

	/**
	 * No category of this harness lists six presets, so the six-column grid is
	 * filled by the search: the results are laid out in the same grid
	 * (StencilPanelGrid) as a category's presets.
	 */
	test("lines its grid up with the search box, first column to last", async ({
		canvas,
	}) => {
		await canvas.openCatalog();
		const page = canvas.page;
		await page.locator(selectors.stencilPanelSearch).fill("e");
		const items = page.locator(
			`${selectors.stencilFlyout} [data-id="stencil-library"]`,
		);
		await expect.poll(() => items.count()).toBeGreaterThanOrEqual(6);

		const searchBox = await page
			.locator(selectors.stencilPanelSearch)
			.boundingBox();
		const firstItem = await items.nth(0).boundingBox();
		const sixthItem = await items.nth(5).boundingBox();
		if (searchBox === null || firstItem === null || sixthItem === null) {
			throw new Error("the search box or the grid is not laid out");
		}
		expect(Math.abs(firstItem.x - searchBox.x)).toBeLessThanOrEqual(1);
		expect(
			Math.abs(sixthItem.x + sixthItem.width - (searchBox.x + searchBox.width)),
		).toBeLessThanOrEqual(1);
	});
});
