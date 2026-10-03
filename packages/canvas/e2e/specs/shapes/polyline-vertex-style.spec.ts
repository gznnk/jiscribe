import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Styling a polyline while one of its vertices is picked.
 *
 * polyline-vertex.spec covers picking a vertex and deleting it; what a pick does
 * to the menus around it was untested. Two things are guarded here.
 *
 * (1) The ObjectMenu keeps its line items. The menus narrow themselves to text
 * while a *text slot* is picked, and they tell the two apart by asking the part
 * kind (isTextSlotAddressed) rather than reading the picked id as a slot id.
 * Read it directly and a vertex looks like a slot, which narrows a polyline —
 * a type with no text items at all — down to an empty menu that disappears.
 *
 * (2) A style write leaves the pick standing, so Delete right after the write
 * still takes the vertex rather than the shape.
 *
 * Sync note: a vertex counts as picked once its handle takes the selection fill
 * (#0d99ff), the same commit point polyline-vertex.spec waits for.
 *
 * Check note: with the middle vertex gone the polyline is a horizontal straight
 * line (height 0), which Playwright's toBeVisible() treats as hidden, so its
 * presence is checked with count.
 */

const SELECTED_FILL = "#0d99ff";

/** Counts vertices in the points attribute ("x1,y1 x2,y2" -> 2). */
async function vertexCount(canvas: CanvasDriver, id: string): Promise<number> {
	const points = await canvas.objectById(id).getAttribute("points");
	return points ? points.trim().split(/\s+/).length : 0;
}

const vertexHandle = (canvas: CanvasDriver, id: string, vertexIndex: number) =>
	canvas.page.locator(
		`[data-kind="control"][data-id="${id}"][data-part="vertex:${vertexIndex}"]`,
	);

/** The drawn stroke of the visual polyline, which is the element the style lands on. */
async function visualStroke(canvas: CanvasDriver, id: string): Promise<string> {
	const visual = await canvas.visualPolylineFor(id);
	return visual.evaluate((el) => getComputedStyle(el).stroke);
}

/** Drags the control matched by the CSS selector to a content-coordinate point. */
async function dragControl(
	canvas: CanvasDriver,
	controlSelector: string,
	to: { x: number; y: number },
) {
	const control = canvas.page.locator(controlSelector);
	await expect(control).toBeVisible();
	const box = await control.boundingBox();
	if (!box) {
		throw new Error(`cannot locate the control ${controlSelector}`);
	}
	// box is in screen coordinates while drag takes content coordinates, hence toContent.
	await canvas.drag(
		canvas.toContent({ x: box.x + box.width / 2, y: box.y + box.height / 2 }),
		to,
		10,
	);
}

/**
 * Draws a horizontal polyline and bends it once, so it has a middle vertex to
 * pick and one to spare over the two an open line needs.
 */
async function buildBentPolyline(canvas: CanvasDriver): Promise<string> {
	const id = await canvas.drawShape(
		"Polyline",
		{ x: 300, y: 300 },
		{ x: 600, y: 300 },
	);
	await dragControl(canvas, `[data-id="${id}"][data-part="vertex-insert:0"]`, {
		x: 450,
		y: 420,
	});
	await expect.poll(() => vertexCount(canvas, id)).toBe(3);
	return id;
}

/** Clicks a vertex handle and waits for the fill that says the pick is committed. */
async function pickVertex(
	canvas: CanvasDriver,
	id: string,
	vertexIndex: number,
) {
	const selectedFill = await canvas.normalizeColor(SELECTED_FILL);
	await vertexHandle(canvas, id, vertexIndex).click();
	await expect
		.poll(
			() =>
				vertexHandle(canvas, id, vertexIndex).evaluate(
					(el) => getComputedStyle(el).fill,
				),
			{
				message: `vertex ${vertexIndex} is picked, showing the selection fill`,
			},
		)
		.toBe(selectedFill);
}

test.describe("styling a polyline with a vertex picked", () => {
	test("keeps the line items in the ObjectMenu instead of narrowing to text", async ({
		canvas,
	}) => {
		const id = await buildBentPolyline(canvas);

		await pickVertex(canvas, id, 1);

		// The menu still states the object, so the two items a polyline has are both
		// offered. Were a vertex taken for a text slot, the polyline would be left
		// with no item at all and the menu would go away.
		await expect(canvas.page.locator(selectors.objectMenu)).toBeVisible();
		await expect(
			canvas.page.locator(selectors.objectMenuToggle("line-color")),
		).toBeVisible();
		await expect(
			canvas.page.locator(selectors.objectMenuToggle("line-style")),
		).toBeVisible();
	});

	test("leaves the vertex picked through a line-color write, so Delete takes the vertex", async ({
		canvas,
	}) => {
		const id = await buildBentPolyline(canvas);
		const before = await vertexCount(canvas, id);

		await pickVertex(canvas, id, 1);

		// A preset swatch rather than the CSS color input: the input would hold the
		// keyboard focus, and the shortcuts are skipped while a form element has it.
		const expectedStroke = await canvas.normalizeColor("#dc2626");
		await canvas.pickColorSwatch("line-color", "stroke", "#dc2626");
		await expect
			.poll(() => visualStroke(canvas, id), {
				message: "the visual polyline takes the line color",
			})
			.toBe(expectedStroke);

		// The write is the object's, so it leaves the pick below it alone.
		expect(
			await vertexHandle(canvas, id, 1).evaluate(
				(el) => getComputedStyle(el).fill,
			),
		).toBe(await canvas.normalizeColor(SELECTED_FILL));

		await canvas.deleteSelection();

		await expect
			.poll(() => vertexCount(canvas, id), {
				message: "Delete removes the picked vertex, not the shape",
			})
			.toBe(before - 1);
		expect(await canvas.objectById(id).count()).toBe(1);

		await canvas.undo();
		await expect
			.poll(() => vertexCount(canvas, id), {
				message: "undo restores the vertex",
			})
			.toBe(before);
	});
});
