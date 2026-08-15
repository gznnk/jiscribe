import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * e2e for editing a connector's label (label.text).
 *
 * - A connector without a label starts label editing on a double click on the line
 * - Typing and committing draws a horizontal label on the route
 *   (foreignObject[data-kind=connector]) at the double-clicked point (not at the
 *   route midpoint). Cancelling with Escape leaves nothing behind
 * - Once a label exists, only a double click on the label box starts re-editing
 *   (a double click on the line only selects; tapping the line while editing
 *   commits as an outside-the-label tap)
 * - A plain label is removed when committed as an empty string
 * - A styled label keeps its style when emptied and is restored by typing again
 *   (only the style is kept; the position belonged to the removed label and is
 *   not carried over)
 * - A multi-line label has the same height before committing (the real textarea
 *   layout) and after committing (the measured line boxes)
 */

type Vec = { x: number; y: number };

/** Allowed gap between the double-click point and the label center. */
const TOLERANCE_PX = 2;

/** Allowed label-height gap between editing and after commit (subpixel rounding). */
const HEIGHT_TOLERANCE_PX = 2;

function parsePoints(attr: string | null): Vec[] {
	if (!attr) {
		throw new Error("cannot read the points attribute");
	}
	return attr
		.trim()
		.split(/\s+/)
		.map((pair) => {
			const [x, y] = pair.split(",").map(Number);
			return { x, y };
		});
}

/** Midpoint of the connector's first segment (always a point on the line). */
async function pointOnConnector(
	canvas: CanvasDriver,
	connectorId: string,
): Promise<Vec> {
	const points = parsePoints(
		await canvas.objectById(connectorId).getAttribute("points"),
	);
	expect(points.length).toBeGreaterThanOrEqual(2);
	return {
		x: (points[0].x + points[1].x) / 2,
		y: (points[0].y + points[1].y) / 2,
	};
}

/** Locator for the label box (the LabelBox div inside foreignObject). */
function labelBoxOf(canvas: CanvasDriver, connectorId: string) {
	return canvas.page
		.locator(`foreignObject[data-kind=connector][data-id="${connectorId}"]`)
		.locator("div")
		.first();
}

/** Point on the line at arc-length ratio t along the route (0=source, 1=target). */
function pointAtRatio(points: Vec[], t: number): Vec {
	const lengths = points
		.slice(1)
		.map((point, i) =>
			Math.hypot(point.x - points[i].x, point.y - points[i].y),
		);
	const target = lengths.reduce((sum, length) => sum + length, 0) * t;

	let traveled = 0;
	for (let i = 0; i < lengths.length; i++) {
		if (traveled + lengths[i] >= target) {
			const ratio = (target - traveled) / lengths[i];
			return {
				x: points[i].x + (points[i + 1].x - points[i].x) * ratio,
				y: points[i].y + (points[i + 1].y - points[i].y) * ratio,
			};
		}
		traveled += lengths[i];
	}
	return points[points.length - 1];
}

function distance(a: Vec, b: Vec): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Center of the label box (content coordinates). */
async function labelCenter(
	canvas: CanvasDriver,
	connectorId: string,
): Promise<Vec> {
	const box = await labelBoxOf(canvas, connectorId).boundingBox();
	if (!box) {
		throw new Error("cannot read the position of the label box");
	}
	return canvas.toContent({
		x: box.x + box.width / 2,
		y: box.y + box.height / 2,
	});
}

/**
 * A point on the line far enough from the label box. A label is created where it
 * was double clicked, so testing "a double click on the line (outside the label)"
 * requires picking a point that is not underneath the label.
 */
async function bareLinePoint(
	canvas: CanvasDriver,
	connectorId: string,
): Promise<Vec> {
	const points = parsePoints(
		await canvas.objectById(connectorId).getAttribute("points"),
	);
	const point = pointAtRatio(points, 0.8);
	expect(
		distance(point, await labelCenter(canvas, connectorId)),
	).toBeGreaterThan(40);
	return point;
}

/** Creates and returns a connector without a label joining two rectangles. */
async function setupConnector(canvas: CanvasDriver): Promise<string> {
	await canvas.drawShape("Rectangle", { x: 300, y: 150 }, { x: 500, y: 250 });
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 700, y: 300 }, { x: 900, y: 400 });
	await canvas.deselect();

	await canvas.selectAt({ x: 400, y: 200 });
	const connectorId = await canvas.createConnector("rightCenter", {
		x: 715,
		y: 350,
	});
	await canvas.deselect();
	return connectorId;
}

/**
 * Creates a connector joining two rectangles, gives it a label, and returns it.
 * (Helper for the preamble many tests share.)
 */
async function setupConnectorWithLabel(
	canvas: CanvasDriver,
	text: string,
): Promise<{ connectorId: string; onLine: Vec }> {
	const connectorId = await setupConnector(canvas);

	const onLine = await pointOnConnector(canvas, connectorId);
	await canvas.typeTextAt(onLine, text);
	await canvas.commitText();
	return { connectorId, onLine };
}

test.describe("connector label", () => {
	test("adds, re-edits and removes a label by double clicking", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 150 }, { x: 500, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 700, y: 300 }, { x: 900, y: 400 });
		await canvas.deselect();

		await canvas.selectAt({ x: 400, y: 200 });
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 715,
			y: 350,
		});
		await canvas.deselect();

		const labelLocator = canvas.page.locator(
			`foreignObject[data-kind=connector][data-id="${connectorId}"]`,
		);

		// Add: double click on the line -> type -> commit.
		const onLine = await pointOnConnector(canvas, connectorId);
		await canvas.typeTextAt(onLine, "Yes");
		await canvas.commitText();
		await expect(labelLocator).toContainText("Yes");

		// Re-edit: a double click on the label box prefills the existing text.
		await labelBoxOf(canvas, connectorId).dblclick();
		await expect(canvas.page.locator(selectors.textEditor)).toBeVisible();
		await expect(canvas.textEditorSurface()).toHaveValue("Yes");

		// Remove: committing an empty string drops the whole label.
		await canvas.textEditorSurface().fill("");
		await canvas.commitText();
		await expect(labelLocator).toHaveCount(0);
	});

	test("creates the label at the double-clicked position", async ({
		canvas,
	}) => {
		const connectorId = await setupConnector(canvas);
		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		// Pick a point on the line far enough from the midpoint so the test would not
		// pass if the label were placed at the midpoint.
		const clickPoint = pointAtRatio(points, 0.25);
		expect(distance(clickPoint, pointAtRatio(points, 0.5))).toBeGreaterThan(30);

		await canvas.typeTextAt(clickPoint, "Yes");
		await canvas.commitText();

		await expect
			.poll(
				async () =>
					distance(await labelCenter(canvas, connectorId), clickPoint),
				{ message: "the label center should land on the double-click point" },
			)
			.toBeLessThanOrEqual(TOLERANCE_PX);
	});

	test("creates no label when leaving with Escape after a double click", async ({
		canvas,
	}) => {
		const connectorId = await setupConnector(canvas);
		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const labelLocator = canvas.page.locator(
			`foreignObject[data-kind=connector][data-id="${connectorId}"]`,
		);

		// Start editing somewhere other than the midpoint and cancel with the text
		// still typed in.
		await canvas.typeTextAt(pointAtRatio(points, 0.25), "Yes");
		await canvas.cancelText();
		await expect(labelLocator).toHaveCount(0);

		// Cancelling leaves no trace, so a double click elsewhere can create it again.
		await canvas.deselect();
		const clickPoint = pointAtRatio(points, 0.75);
		await canvas.typeTextAt(clickPoint, "Back");
		await canvas.commitText();
		await expect(labelLocator).toContainText("Back");
		await expect
			.poll(
				async () =>
					distance(await labelCenter(canvas, connectorId), clickPoint),
				{
					message:
						"the recreated label should also land on the second double-click point",
				},
			)
			.toBeLessThanOrEqual(TOLERANCE_PX);
	});

	test("lands on the double-click point rather than the pre-removal position when a label is removed and re-added", async ({
		canvas,
	}) => {
		const connectorId = await setupConnector(canvas);
		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const labelLocator = canvas.page.locator(
			`foreignObject[data-kind=connector][data-id="${connectorId}"]`,
		);

		// Create the label at a non-midpoint (the position is kept as label.position).
		const firstPoint = pointAtRatio(points, 0.25);
		await canvas.typeTextAt(firstPoint, "Yes");
		await canvas.commitText();
		await expect(labelLocator).toContainText("Yes");

		// Remove it by committing an empty string from the label box.
		await labelBoxOf(canvas, connectorId).dblclick();
		await expect(canvas.textEditorSurface()).toHaveValue("Yes");
		await canvas.textEditorSurface().fill("");
		await canvas.commitText();
		await expect(labelLocator).toHaveCount(0);

		// Re-add it by double clicking another point (the removed label's position is
		// not carried over).
		await canvas.deselect();
		const secondPoint = pointAtRatio(points, 0.75);
		expect(distance(firstPoint, secondPoint)).toBeGreaterThan(30);
		await canvas.typeTextAt(secondPoint, "Back");
		await canvas.commitText();
		await expect(labelLocator).toContainText("Back");

		await expect
			.poll(
				async () =>
					distance(await labelCenter(canvas, connectorId), secondPoint),
				{
					message:
						"the re-added label should land on the second double-click point",
				},
			)
			.toBeLessThanOrEqual(TOLERANCE_PX);
	});

	test("changes the label background color from the styling UI (label.fill)", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 150 }, { x: 500, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 700, y: 300 }, { x: 900, y: 400 });
		await canvas.deselect();

		await canvas.selectAt({ x: 400, y: 200 });
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 715,
			y: 350,
		});
		await canvas.deselect();

		// Add a label (the label-style menu only appears when a label exists).
		const onLine = await pointOnConnector(canvas, connectorId);
		await canvas.typeTextAt(onLine, "Yes");
		await canvas.commitText();

		// Select the connector, open the label background color menu and press a
		// background color swatch.
		await canvas.clickAt(onLine);
		await canvas.openObjectMenu("label-bg-color");
		await canvas.page.click(selectors.objectMenuSet("label.fill", "#dc2626"));

		// The label box background is updated through the dot notation
		// (label.fill -> #dc2626).
		const labelBox = canvas.page
			.locator(`foreignObject[data-kind=connector][data-id="${connectorId}"]`)
			.locator("div")
			.first();
		await expect(labelBox).toHaveCSS("background-color", "rgb(220, 38, 38)");
	});

	test("changes the label border style (width, dashes) from the styling UI", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 150 }, { x: 500, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 700, y: 300 }, { x: 900, y: 400 });
		await canvas.deselect();

		await canvas.selectAt({ x: 400, y: 200 });
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 715,
			y: 350,
		});
		await canvas.deselect();

		const onLine = await pointOnConnector(canvas, connectorId);
		await canvas.typeTextAt(onLine, "Yes");
		await canvas.commitText();

		// Open the border style menu, set the width to 2 and pick dashed.
		await canvas.clickAt(onLine);
		await canvas.openObjectMenu("label-border-style");
		await canvas.page
			.locator('[data-testid="menu-number-input:label.strokeWidth"]')
			.fill("2");
		await canvas.page.click(
			selectors.objectMenuSet("label.strokeDashType", "dashed"),
		);

		const labelBox = canvas.page
			.locator(`foreignObject[data-kind=connector][data-id="${connectorId}"]`)
			.locator("div")
			.first();
		await expect(labelBox).toHaveCSS("border-top-style", "dashed");
		await expect(labelBox).toHaveCSS("border-top-width", "2px");
	});

	test("makes the label bold from the styling UI (label.fontWeight)", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 150 }, { x: 500, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 700, y: 300 }, { x: 900, y: 400 });
		await canvas.deselect();

		await canvas.selectAt({ x: 400, y: 200 });
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 715,
			y: 350,
		});
		await canvas.deselect();

		const onLine = await pointOnConnector(canvas, connectorId);
		await canvas.typeTextAt(onLine, "Yes");
		await canvas.commitText();

		// The bold toggle is a direct button with no dropdown (a set on the gesture
		// path).
		await canvas.clickAt(onLine);
		await canvas.page.click(
			selectors.objectMenuSet("label.fontWeight", "bold"),
		);

		const labelBox = canvas.page
			.locator(`foreignObject[data-kind=connector][data-id="${connectorId}"]`)
			.locator("div")
			.first();
		await expect(labelBox).toHaveCSS("font-weight", "700");
	});

	test("starts label editing on double click even over the insert handle at the midpoint of a straight connector", async ({
		canvas,
	}) => {
		// Dropping onto the center of the target makes it a center anchor, hence the
		// default straight routing (the insert handle sits at the midpoint = the
		// default label position, the U1 collision condition).
		await canvas.drawShape("Rectangle", { x: 300, y: 150 }, { x: 500, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 700, y: 300 }, { x: 900, y: 400 });
		await canvas.deselect();
		await canvas.selectAt({ x: 400, y: 200 });
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 800,
			y: 350,
		});
		await canvas.deselect();

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		expect(points).toHaveLength(2);
		const mid = pointAtRatio(points, 0.5);

		// Select the line and wait for the insert handle to appear at the midpoint.
		await canvas.clickAt(mid);
		await expect(
			canvas.page.locator(
				`[data-part="waypoint-insert:0"][data-id="${connectorId}"]`,
			),
		).toBeVisible();

		// Wait longer than the doubleClick time threshold (300ms) so the selecting
		// click does not pair with the first press of the double click (if they pair,
		// the first press opens the editor and the second is treated as an outside
		// tap that immediately commits an empty edit).
		await canvas.page.waitForTimeout(400);

		// Even with both presses absorbed by the handle, they arrive as "a double
		// click on the connector" and start label editing rather than waypoint
		// insertion.
		const screen = canvas.toScreen(mid);
		await canvas.page.mouse.dblclick(screen.x, screen.y);
		await expect(canvas.page.locator(selectors.textEditor)).toBeVisible();
		await canvas.textEditorSurface().fill("Mid");
		await canvas.commitText();
		await expect(labelBoxOf(canvas, connectorId)).toContainText("Mid");

		// The double click inserted no waypoint (still a straight line).
		expect(
			parsePoints(await canvas.objectById(connectorId).getAttribute("points")),
		).toHaveLength(2);
	});

	test("re-edits on double click even when the insert handle covers a committed label at the center", async ({
		canvas,
	}) => {
		// Put a label at the default position = the midpoint of a straight connector
		// (the same setup as the previous test). Selecting it overlaps the insert
		// handle right on top of the label center (the U1 collision condition).
		await canvas.drawShape("Rectangle", { x: 300, y: 150 }, { x: 500, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 700, y: 300 }, { x: 900, y: 400 });
		await canvas.deselect();
		await canvas.selectAt({ x: 400, y: 200 });
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 800,
			y: 350,
		});
		await canvas.deselect();

		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		expect(points).toHaveLength(2);
		const mid = pointAtRatio(points, 0.5);
		await canvas.typeTextAt(mid, "Yes");
		await canvas.commitText();

		// Click the label center (= the midpoint) to select, and wait for the handle
		// to overlap the label.
		await canvas.clickAt(mid);
		await expect(
			canvas.page.locator(
				`[data-part="waypoint-insert:0"][data-id="${connectorId}"]`,
			),
		).toBeVisible();

		// Separation wait to avoid coalescing with the selecting click (see the
		// comment in the previous test).
		await canvas.page.waitForTimeout(400);

		// Both presses hit the frontmost handle, but the label box underneath is
		// found through the hover stack (the real DOM elementsFromPoint), so
		// re-editing of the existing label opens.
		const screen = canvas.toScreen(mid);
		await canvas.page.mouse.dblclick(screen.x, screen.y);
		await expect(canvas.page.locator(selectors.textEditor)).toBeVisible();
		await expect(canvas.textEditorSurface()).toHaveValue("Yes");

		// It can be rewritten and committed on the spot (it did not turn into a
		// creation or a removal).
		await canvas.textEditorSurface().fill("No");
		await canvas.commitText();
		await expect(labelBoxOf(canvas, connectorId)).toContainText("No");
		expect(
			parsePoints(await canvas.objectById(connectorId).getAttribute("points")),
		).toHaveLength(2);
	});

	test("starts label editing with Enter while a connector is selected and cancels with Escape", async ({
		canvas,
	}) => {
		const { connectorId, onLine } = await setupConnectorWithLabel(
			canvas,
			"Yes",
		);

		// Click the line to select the connector -> Enter starts label editing
		// (StartTextEditCommand). A single click is recognized with a delay because
		// of the double-click decision, so wait for the signal that the selection
		// settled (the label style menu appearing) before sending Enter.
		await canvas.clickAt(onLine);
		await expect(
			canvas.page.locator(selectors.objectMenuToggle("label-bg-color")),
		).toBeVisible();
		await canvas.page.keyboard.press("Enter");
		await expect(canvas.page.locator(selectors.textEditor)).toBeVisible();
		// The existing label is prefilled.
		await expect(canvas.textEditorSurface()).toHaveValue("Yes");

		// Escape cancels. Rewritten text is discarded and the original label stays.
		await canvas.textEditorSurface().fill("Changed");
		await canvas.cancelText();
		await expect(labelBoxOf(canvas, connectorId)).toContainText("Yes");
	});

	test("changes the label font color from the styling UI (label.fontColor)", async ({
		canvas,
	}) => {
		const { connectorId, onLine } = await setupConnectorWithLabel(
			canvas,
			"Yes",
		);

		await canvas.clickAt(onLine);
		await canvas.openObjectMenu("label-font-color");
		await canvas.page.click(
			selectors.objectMenuSet("label.fontColor", "#3b82f6"),
		);

		await expect(labelBoxOf(canvas, connectorId)).toHaveCSS(
			"color",
			"rgb(59, 130, 246)",
		);
	});

	test("changes the label font size from the styling UI (label.fontSize)", async ({
		canvas,
	}) => {
		const { connectorId, onLine } = await setupConnectorWithLabel(
			canvas,
			"Yes",
		);

		await canvas.clickAt(onLine);
		await canvas.openObjectMenu("label-font-size");
		await canvas.setNumberInput("label.fontSize", 28);

		await expect(labelBoxOf(canvas, connectorId)).toHaveCSS(
			"font-size",
			"28px",
		);
	});

	test("changes the label border color from the styling UI (label.stroke)", async ({
		canvas,
	}) => {
		const { connectorId, onLine } = await setupConnectorWithLabel(
			canvas,
			"Yes",
		);

		// The border is only visible when the width is > 0, so give it a width before
		// picking a color.
		await canvas.clickAt(onLine);
		await canvas.openObjectMenu("label-border-style");
		await canvas.setNumberInput("label.strokeWidth", 3);
		await canvas.openObjectMenu("label-border-color");
		await canvas.page.click(selectors.objectMenuSet("label.stroke", "#3b82f6"));

		const labelBox = labelBoxOf(canvas, connectorId);
		await expect(labelBox).toHaveCSS("border-top-width", "3px");
		await expect(labelBox).toHaveCSS("border-top-color", "rgb(59, 130, 246)");
	});

	test("clears bold by toggling (bold -> normal returns to 400)", async ({
		canvas,
	}) => {
		const { connectorId, onLine } = await setupConnectorWithLabel(
			canvas,
			"Yes",
		);
		const labelBox = labelBoxOf(canvas, connectorId);

		await canvas.clickAt(onLine);
		await canvas.page.click(
			selectors.objectMenuSet("label.fontWeight", "bold"),
		);
		await expect(labelBox).toHaveCSS("font-weight", "700");

		// The bold button is a direct toggle whose data-id flips with the state.
		// Pressing it again returns to normal.
		await canvas.page.click(
			selectors.objectMenuSet("label.fontWeight", "normal"),
		);
		await expect(labelBox).toHaveCSS("font-weight", "400");
	});

	test("keeps the styles when the text is re-edited after applying several styles", async ({
		canvas,
	}) => {
		const { connectorId, onLine } = await setupConnectorWithLabel(
			canvas,
			"Yes",
		);
		const labelBox = labelBoxOf(canvas, connectorId);

		// Apply bold plus a background color.
		await canvas.clickAt(onLine);
		await canvas.page.click(
			selectors.objectMenuSet("label.fontWeight", "bold"),
		);
		await canvas.openObjectMenu("label-bg-color");
		await canvas.page.click(selectors.objectMenuSet("label.fill", "#dc2626"));
		await expect(labelBox).toHaveCSS("font-weight", "700");
		await expect(labelBox).toHaveCSS("background-color", "rgb(220, 38, 38)");

		// Re-edit from the label box and change only the text (not an empty string,
		// so the label should be kept).
		await labelBox.dblclick();
		await expect(canvas.textEditorSurface()).toHaveValue("Yes");
		await canvas.textEditorSurface().fill("No");
		await canvas.commitText();

		await expect(labelBox).toContainText("No");
		await expect(labelBox).toHaveCSS("font-weight", "700");
		await expect(labelBox).toHaveCSS("background-color", "rgb(220, 38, 38)");
	});

	test("carries the label (text and style) over through copy and paste", async ({
		canvas,
	}) => {
		const { connectorId, onLine } = await setupConnectorWithLabel(
			canvas,
			"Yes",
		);

		// Give the label a background color, then copy and paste, and check that the
		// clone keeps the text plus the style.
		await canvas.clickAt(onLine);
		await canvas.openObjectMenu("label-bg-color");
		await canvas.page.click(selectors.objectMenuSet("label.fill", "#dc2626"));
		await expect(labelBoxOf(canvas, connectorId)).toHaveCSS(
			"background-color",
			"rgb(220, 38, 38)",
		);

		// Close the menu and return focus to the canvas before select-all and
		// copy/paste.
		await canvas.deselect();
		await canvas.selectAll();
		await canvas.copy();
		await canvas.paste();

		// Wait until there are 2 connectors and get the id of the clone.
		await expect
			.poll(
				async () =>
					(await canvas.page.locator(selectors.connectorPolyline).all()).length,
			)
			.toBeGreaterThanOrEqual(2);
		const allIds = await canvas.page.evaluate((sel) => {
			return [...document.querySelectorAll(sel)]
				.map((el) => el.getAttribute("data-id"))
				.filter((id): id is string => id !== null);
		}, selectors.connectorPolyline);
		const clonedId = allIds.find((id) => id !== connectorId);
		if (!clonedId) {
			throw new Error("cannot read the data-id of the cloned connector");
		}

		const clonedLabel = labelBoxOf(canvas, clonedId);
		await expect(clonedLabel).toContainText("Yes");
		await expect(clonedLabel).toHaveCSS("background-color", "rgb(220, 38, 38)");
	});

	test("reverts a label style change with Undo", async ({ canvas }) => {
		const { connectorId, onLine } = await setupConnectorWithLabel(
			canvas,
			"Yes",
		);
		const labelBox = labelBoxOf(canvas, connectorId);

		await canvas.clickAt(onLine);
		await canvas.openObjectMenu("label-bg-color");
		await canvas.page.click(selectors.objectMenuSet("label.fill", "#dc2626"));
		await expect(labelBox).toHaveCSS("background-color", "rgb(220, 38, 38)");

		// Clear the selection first so no input keeps focus, then Undo.
		await canvas.deselect();
		await canvas.undo();

		// The background color is no longer red (back to the default = the canvas
		// base color). The label itself stays.
		await expect(labelBox).toContainText("Yes");
		await expect(labelBox).not.toHaveCSS(
			"background-color",
			"rgb(220, 38, 38)",
		);
	});

	test("restores the style on retyping after a styled label is removed with an empty string", async ({
		canvas,
	}) => {
		const { connectorId, onLine } = await setupConnectorWithLabel(
			canvas,
			"Yes",
		);
		const labelBox = labelBoxOf(canvas, connectorId);

		// Give it a background color.
		await canvas.clickAt(onLine);
		await canvas.openObjectMenu("label-bg-color");
		await canvas.page.click(selectors.objectMenuSet("label.fill", "#dc2626"));
		await expect(labelBox).toHaveCSS("background-color", "rgb(220, 38, 38)");

		// Edit from the label box, empty the text and commit -> the label visually
		// disappears (hidden when text="").
		await labelBox.dblclick();
		await expect(canvas.textEditorSurface()).toHaveValue("Yes");
		await canvas.textEditorSurface().fill("");
		await canvas.commitText();
		await expect(labelBox).toHaveCount(0);

		// With the label gone, a double click on the line can type the text again
		// (the prefill is empty). Pick a point other than where it was removed to
		// also check that only the style is restored.
		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const rePoint = pointAtRatio(points, 0.75);
		expect(distance(rePoint, onLine)).toBeGreaterThan(30);
		const screen = canvas.toScreen(rePoint);
		await canvas.page.mouse.dblclick(screen.x, screen.y);
		await canvas.waitForTextEditor();
		await expect(canvas.textEditorSurface()).toHaveValue("");
		await canvas.page.keyboard.type("Back");
		await canvas.commitText();

		// The text is back and the previous background color style is restored too.
		await expect(labelBox).toContainText("Back");
		await expect(labelBox).toHaveCSS("background-color", "rgb(220, 38, 38)");

		// Unlike the style, the position is not carried over: it lands on the second
		// double-click point.
		await expect
			.poll(
				async () => distance(await labelCenter(canvas, connectorId), rePoint),
				{
					message:
						"the re-added label should land on the second double-click point",
				},
			)
			.toBeLessThanOrEqual(TOLERANCE_PX);
	});

	test("does not start editing on a double click on the line for a connector that has a label (selects only)", async ({
		canvas,
	}) => {
		const { connectorId } = await setupConnectorWithLabel(canvas, "Yes");
		await canvas.deselect();

		// Double click on the line (outside the label box) -> the connector is
		// selected but the editor does not open.
		const screen = canvas.toScreen(await bareLinePoint(canvas, connectorId));
		await canvas.page.mouse.dblclick(screen.x, screen.y);
		await expect(
			canvas.page.locator(selectors.objectMenuToggle("line-style")),
		).toBeVisible();
		await expect(canvas.page.locator(selectors.textEditor)).toHaveCount(0);
	});

	test("commits as an outside-the-label tap without stacking an extra commit when the line is double clicked while editing (#102)", async ({
		canvas,
	}) => {
		const { connectorId } = await setupConnectorWithLabel(canvas, "Yes");
		const labelBox = labelBoxOf(canvas, connectorId);
		await expect(labelBox).toContainText("Yes");
		const offLabel = await bareLinePoint(canvas, connectorId);

		// Start editing from the label box and rewrite the text (not committed yet).
		await labelBox.dblclick();
		await expect(canvas.page.locator(selectors.textEditor)).toBeVisible();
		await expect(canvas.textEditorSurface()).toHaveValue("Yes");
		await canvas.textEditorSurface().fill("No");

		// Double click on the line without committing -> it is a tap outside the
		// label, so "No" is committed and the editor does not reopen (a double click
		// on a line that has a label only selects).
		const screen = canvas.toScreen(offLabel);
		await canvas.page.mouse.dblclick(screen.x, screen.y);
		await expect(canvas.page.locator(selectors.textEditor)).toHaveCount(0);
		await expect(labelBox).toContainText("No");

		// There are only 2 commits: "add label" and "Yes->No" (if the leading pressed
		// and the doubleClick each committed, the first Undo would leave "No").
		// Two Undos drop the whole label.
		await canvas.deselect();
		await canvas.undo();
		await expect(labelBox).toContainText("Yes");
		await canvas.undo();
		await expect(labelBox).toHaveCount(0);
	});

	test("shows no label style menu for a connector without a label", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 150 }, { x: 500, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 700, y: 300 }, { x: 900, y: 400 });
		await canvas.deselect();

		await canvas.selectAt({ x: 400, y: 200 });
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 715,
			y: 350,
		});
		await canvas.deselect();

		// Select a connector with no label -> no label menus appear. Confirm
		// "selected" first via the line-style toggle appearing, then verify the
		// absence of the label toggle.
		const onLine = await pointOnConnector(canvas, connectorId);
		await canvas.clickAt(onLine);
		await expect(
			canvas.page.locator(selectors.objectMenuToggle("line-style")),
		).toBeVisible();
		await expect(
			canvas.page.locator(selectors.objectMenuToggle("label-bg-color")),
		).toHaveCount(0);

		// It appears once a label is added and the connector is selected again.
		// Deselect in between to avoid coalescing consecutive clicks.
		await canvas.deselect();
		await canvas.typeTextAt(onLine, "Yes");
		await canvas.commitText();
		await canvas.clickAt(onLine);
		await expect(
			canvas.page.locator(selectors.objectMenuToggle("label-bg-color")),
		).toBeVisible();
	});

	test("keeps the committed height equal to the editing height for a label of several lines", async ({
		canvas,
	}) => {
		// While editing, the height comes from the real textarea layout
		// (scrollHeight); after committing, from the measured line boxes. If the two
		// disagree, the label is clipped by one line the moment it is committed.
		const connectorId = await setupConnector(canvas);
		const onLine = await pointOnConnector(canvas, connectorId);

		// The label breaks only where the author typed a newline, so these are
		// exactly 3 lines however wide the words are.
		const word = "Telecommunications";
		const text = `${word}\n${word}\n${word}`;
		await canvas.typeTextAt(onLine, text);
		await expect(canvas.textEditorSurface()).toHaveValue(text);

		// One line is 16 x 1.5 + padding 4 = 28px, so 3 lines exceed 70px.
		const editorBox = canvas.page.locator(selectors.textEditor);
		await expect
			.poll(async () => (await editorBox.boundingBox())?.height ?? 0, {
				message: "the label being edited should take 3 lines",
			})
			.toBeGreaterThan(70);
		const editorHeight = (await editorBox.boundingBox())?.height ?? 0;

		await canvas.commitText();
		const labelBox = labelBoxOf(canvas, connectorId);
		await expect(labelBox).toContainText(text);

		// The rendered height matches the editing height (subpixel rounding allowed).
		await expect
			.poll(
				async () =>
					Math.abs(
						((await labelBox.boundingBox())?.height ?? 0) - editorHeight,
					),
				{
					message:
						"the rendered height after commit should match the editing height",
				},
			)
			.toBeLessThanOrEqual(HEIGHT_TOLERANCE_PX);
	});

	// A line box is fontSize × 1.5 tall, so an odd size makes the drawn box end on
	// a half pixel. The editor used to take its height from scrollHeight, which is
	// a whole number, and the extra half pixel moved the label the moment editing
	// started (see fitTextAreaHeight).
	test("re-opens the editor on the label at an odd font size", async ({
		canvas,
	}) => {
		const { connectorId, onLine } = await setupConnectorWithLabel(
			canvas,
			"Yes",
		);

		await canvas.clickAt(onLine);
		await canvas.openObjectMenu("label-font-size");
		await canvas.setNumberInput("label.fontSize", 15);
		await canvas.deselect();

		const committed = await labelBoxOf(canvas, connectorId).boundingBox();
		await canvas.typeTextAt(onLine, "");
		const editing = await canvas.page
			.locator(selectors.textEditor)
			.boundingBox();

		expect(editing?.y).toBeCloseTo(committed?.y ?? 0, 3);
		expect(editing?.height).toBeCloseTo(committed?.height ?? 0, 3);
	});
});
