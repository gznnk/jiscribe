import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";

/** Box the stick figure fills; the label hangs below its bottom edge (y = 300). */
const FIGURE_FROM = { x: 400, y: 200 };
const FIGURE_TO = { x: 480, y: 300 };
const FIGURE_CENTER = { x: 440, y: 250 };

/** A second and a third actor, to the right of the first. */
const SECOND_FROM = { x: 600, y: 200 };
const SECOND_TO = { x: 680, y: 300 };
const SECOND_CENTER = { x: 640, y: 250 };
const THIRD_FROM = { x: 800, y: 200 };
const THIRD_TO = { x: 880, y: 300 };

/**
 * The actor's label is a `features.text: "label"` caption: the core paints a box
 * behind it in `labelFill` and the shape grabs it through BelowLabelHitArea. The
 * two are placed by different code from the same input, and only a browser lays
 * the label out at the size both of them read.
 */
test.describe("actor label fill", () => {
	test("paints the label's box exactly where its grab area is, and recolours it from the menu", async ({
		canvas,
	}) => {
		const id = await canvas.drawShapeFromFlyout(
			"general",
			"actor",
			FIGURE_FROM,
			FIGURE_TO,
		);
		await canvas.deselect();
		await canvas.typeTextAt(FIGURE_CENTER, "Customer");
		await canvas.commitText();

		const fill = canvas.page.locator('g[data-canvas-export="flatten"] > rect');
		await expect(fill).toHaveCount(1);
		// The second rect of the shape's own group: the first is the box-wide area.
		const grabArea = canvas.objectById(id).locator("rect").nth(1);
		const fillBox = await fill.boundingBox();
		const grabBox = await grabArea.boundingBox();
		expect(fillBox).not.toBeNull();
		expect(grabBox).not.toBeNull();
		for (const key of ["x", "y", "width", "height"] as const) {
			expect(fillBox![key]).toBeCloseTo(grabBox![key], 1);
		}
		expect(fillBox!.y).toBeGreaterThan(
			canvas.toScreen({ x: FIGURE_CENTER.x, y: FIGURE_TO.y }).y,
		);

		await canvas.selectAt(FIGURE_CENTER);
		await canvas.openObjectMenu("label-bg-color");
		await canvas.page.click(selectors.objectMenuSet("labelFill", "#dc2626"));
		await expect(fill).toHaveCSS("fill", "rgb(220, 38, 38)");
	});

	test("paints nothing behind an empty label and offers no background for it", async ({
		canvas,
	}) => {
		await canvas.drawShapeFromFlyout(
			"general",
			"actor",
			FIGURE_FROM,
			FIGURE_TO,
		);

		await expect(
			canvas.page.locator('g[data-canvas-export="flatten"] > rect'),
		).toHaveCount(0);
		await expect(
			canvas.page.locator(
				`${selectors.objectMenu} ${selectors.objectMenuToggle("label-bg-color")}`,
			),
		).toHaveCount(0);
	});

	/** Two labelled actors side by side, the first with a red label background. */
	const drawTwoLabelledActors = async (
		canvas: Parameters<Parameters<typeof test>[2]>[0]["canvas"],
	) => {
		const first = await canvas.drawShapeFromFlyout(
			"general",
			"actor",
			FIGURE_FROM,
			FIGURE_TO,
		);
		await canvas.deselect();
		await canvas.typeTextAt(FIGURE_CENTER, "Customer");
		await canvas.commitText();
		const second = await canvas.drawShapeFromFlyout(
			"general",
			"actor",
			SECOND_FROM,
			SECOND_TO,
		);
		await canvas.deselect();
		await canvas.typeTextAt(SECOND_CENTER, "Staff");
		await canvas.commitText();

		await canvas.selectAt(FIGURE_CENTER);
		await canvas.openObjectMenu("label-bg-color");
		await canvas.page.click(selectors.objectMenuSet("labelFill", "#dc2626"));
		await canvas.deselect();
		return { first, second };
	};

	test("splits the menu's swatch between the colors of a selection that disagrees, and writes to all of it", async ({
		canvas,
	}) => {
		await drawTwoLabelledActors(canvas);
		const fills = canvas.page.locator('g[data-canvas-export="flatten"] > rect');

		await canvas.selectAll();
		const trigger = canvas.page.locator(
			`${selectors.objectMenu} ${selectors.objectMenuToggle("label-bg-color")}`,
		);
		// One slice per distinct color: the red one and the page-colored knockout.
		await expect(trigger.locator("svg path")).toHaveCount(2);

		await canvas.openObjectMenu("label-bg-color");
		await canvas.page.click(selectors.objectMenuSet("labelFill", "#3b82f6"));
		await expect(fills.nth(0)).toHaveCSS("fill", "rgb(59, 130, 246)");
		await expect(fills.nth(1)).toHaveCSS("fill", "rgb(59, 130, 246)");
		await expect(trigger.locator("svg path")).toHaveCount(0);
	});

	test("states the label background in the sidebar, mixed where the selection disagrees, and drops the row for an empty label", async ({
		canvas,
	}) => {
		await drawTwoLabelledActors(canvas);
		const fills = canvas.page.locator('g[data-canvas-export="flatten"] > rect');
		await canvas.openPropertyPanel();
		const field = canvas.page.locator(
			`${selectors.propertyPanel} [aria-label="Label Background Color"]`,
		);

		await canvas.selectAll();
		await expect(field).toContainText("Mixed");

		await field.click();
		await canvas.page.click(selectors.propertyPanelSet("labelFill", "#3b82f6"));
		await expect(fills.nth(0)).toHaveCSS("fill", "rgb(59, 130, 246)");
		await expect(fills.nth(1)).toHaveCSS("fill", "rgb(59, 130, 246)");
		await expect(field).not.toContainText("Mixed");

		// An actor with no label has nothing painted, so the row goes.
		await canvas.deselect();
		await canvas.drawShapeFromFlyout("general", "actor", THIRD_FROM, THIRD_TO);
		await expect(field).toHaveCount(0);
	});
});
