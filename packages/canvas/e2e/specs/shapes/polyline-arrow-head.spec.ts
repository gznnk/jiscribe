import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Arrow head settings on a standalone polyline (a line, not a connector).
 *
 * A polyline's arrow renders as `polygon[data-kind=object][data-id=<id>]` and it
 * has none by default, unlike a connector, which carries a default arrow at its
 * end. The arrow menus are shared with connectors, but the presentation and the
 * defaults differ, so this path is guarded on its own.
 */

/**
 * Number of arrows on the polyline id. Arrows render as polygon / polyline /
 * circle depending on the kind, so tags cannot count them. Every arrow has a
 * transform attribute (a matrix placing it at an endpoint) while the hit-test
 * polyline (data-kind=object, same id, no transform) does not, so elements with
 * the same id and a transform are counted as arrows.
 */
async function arrowCount(canvas: CanvasDriver, id: string): Promise<number> {
	return canvas.page.evaluate(
		(targetId) =>
			[
				...document.querySelectorAll(
					`[data-kind="object"][data-id="${targetId}"]`,
				),
			].filter((el) => el.hasAttribute("transform")).length,
		id,
	);
}

/** Draws a horizontal polyline and returns its id (selected right after drawing). */
async function drawLine(canvas: CanvasDriver): Promise<string> {
	return canvas.drawShape("Polyline", { x: 300, y: 300 }, { x: 600, y: 300 });
}

test.describe("polyline arrow heads", () => {
	test("has no arrow by default and puts one at the end when endArrow is set", async ({
		canvas,
	}) => {
		const id = await drawLine(canvas);
		expect(await arrowCount(canvas, id)).toBe(0);

		await canvas.openObjectMenu("arrow-head-end");
		await canvas.page.click(
			selectors.objectMenuSet("endArrow", "FilledTriangle"),
		);

		await expect.poll(() => arrowCount(canvas, id)).toBe(1);
	});

	test("shows arrows at both ends (2) once startArrow is set as well", async ({
		canvas,
	}) => {
		const id = await drawLine(canvas);

		await canvas.openObjectMenu("arrow-head-end");
		await canvas.page.click(
			selectors.objectMenuSet("endArrow", "FilledTriangle"),
		);
		await expect.poll(() => arrowCount(canvas, id)).toBe(1);

		await canvas.openObjectMenu("arrow-head-start");
		await canvas.page.click(selectors.objectMenuSet("startArrow", "OpenArrow"));
		await expect.poll(() => arrowCount(canvas, id)).toBe(2);
	});

	test("drops the endArrow setting on undo and reapplies it on redo", async ({
		canvas,
	}) => {
		const id = await drawLine(canvas);
		expect(await arrowCount(canvas, id)).toBe(0);

		await canvas.openObjectMenu("arrow-head-end");
		await canvas.page.click(
			selectors.objectMenuSet("endArrow", "FilledTriangle"),
		);
		await expect.poll(() => arrowCount(canvas, id)).toBe(1);

		await canvas.undo();
		await expect.poll(() => arrowCount(canvas, id)).toBe(0);

		await canvas.redo();
		await expect.poll(() => arrowCount(canvas, id)).toBe(1);
	});
});
