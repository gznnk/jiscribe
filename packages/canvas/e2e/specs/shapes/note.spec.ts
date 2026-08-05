import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/** Reads the d attribute of every path of the given note, silhouette first. */
async function notePathDs(canvas: CanvasDriver, id: string): Promise<string[]> {
	return canvas.page.evaluate((objectId) => {
		const paths = document.querySelectorAll(`[data-id="${objectId}"] path`);
		return Array.from(paths).map((path) => path.getAttribute("d") ?? "");
	}, id);
}

/**
 * Width of the note's drawn text box. The overlay is a sibling of the shape
 * group (createFrameObject returns a fragment), so it is reached from the group
 * rather than from inside it.
 */
async function noteTextBoxWidth(
	canvas: CanvasDriver,
	id: string,
): Promise<number | null> {
	return canvas.page.evaluate((objectId) => {
		const shape = document.querySelector(`[data-id="${objectId}"]`);
		const sibling = shape?.nextElementSibling;
		if (sibling?.tagName.toLowerCase() !== "foreignobject") {
			return null;
		}
		return Number(sibling.getAttribute("width"));
	}, id);
}

/**
 * The one shape in the annotation package that takes its text inside the box.
 * What is worth pinning end to end is the pair the fold creates: the silhouette
 * has the top-right corner cut away, and the text box stops short of it
 * (calcNoteTextRegion) so no line can run underneath the fold.
 */
test.describe("note", () => {
	test("creates a g element with the fold as a second path", async ({
		canvas,
	}) => {
		const id = await canvas.drawShapeFromFlyout(
			"annotation",
			"note",
			{ x: 400, y: 200 },
			{ x: 580, y: 310 },
		);
		const created = (await canvas.captureObjects()).find(
			(obj) => obj.id === id,
		);
		// The note root is <g data-kind="object"> (silhouette plus fold).
		expect(created?.tag).toBe("g");

		// 180x110 box, so the fold is 0.2 of the shorter side = 22. The diagonal
		// belongs to the silhouette; the fold is only its two legs.
		expect(await notePathDs(canvas, id)).toEqual([
			"M -90 -55 L 68 -55 L 90 -33 L 90 55 L -90 55 Z",
			"M 68 -55 V -33 H 90",
		]);
	});

	test("takes text inside the box, clear of the fold", async ({ canvas }) => {
		const id = await canvas.drawShapeFromFlyout(
			"annotation",
			"note",
			{ x: 400, y: 200 },
			{ x: 580, y: 310 },
		);
		await canvas.deselect();

		// Double-clicking the box opens the editor for the body slot; unlike the
		// group markers there is no label outside the box to aim at.
		await canvas.typeTextAt({ x: 490, y: 255 }, "retries are capped at 3");
		await canvas.commitText();

		await expect
			.poll(() => canvas.page.evaluate(() => document.body.textContent ?? ""))
			.toContain("retries are capped at 3");

		// 180 wide less the 22 the fold takes off the right edge.
		expect(await noteTextBoxWidth(canvas, id)).toBeCloseTo(158);
	});
});
