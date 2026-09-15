import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";
import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * How a sticky resolves its paper color, for the two documents the editor never
 * produces (its factory always writes an explicit `fill`) and that therefore
 * only arrive written directly, by hand or by an AI — hence the doc hook.
 *
 * - `fill: "auto"` must follow the theme like it does on every other shape
 *   (#38 / #206). The rect beside it is the reference: same "surface" role, so
 *   whatever the theme resolves to, the two must agree. Applied as an SVG `fill`
 *   attribute, "auto" reached the browser as an invalid paint instead.
 * - An **absent** `fill` must draw at the schema's documented default (yellow),
 *   not at the "transparent" the shared surface fallback would give. Parsing
 *   fills nothing in, so this is decided at render time (as in canvas's
 *   default-stroke-width spec).
 *
 * The paper is drawn by hand rather than through createFrameObject, so both
 * resolutions are this package's to repeat.
 */

const docText = JSON.stringify({
	version: 1,
	root: [
		{
			id: "auto-sticky",
			type: "sticky",
			x: 150,
			y: 150,
			width: 160,
			height: 120,
			fill: "auto",
		},
		{
			id: "bare-sticky",
			type: "sticky",
			x: 150,
			y: 350,
			width: 160,
			height: 120,
		},
		{
			id: "auto-rect",
			type: "rect",
			x: 400,
			y: 150,
			width: 160,
			height: 100,
			fill: "auto",
		},
	],
});

/** The computed fill of a sticky's body (its one polygon; the shadow is rects). */
async function stickyBodyFill(
	canvas: CanvasDriver,
	id: string,
): Promise<string | null> {
	return canvas.page.evaluate((stickyId) => {
		const body = document.querySelector(`[data-id="${stickyId}"] polygon`);
		return body ? getComputedStyle(body).fill : null;
	}, id);
}

async function loadDoc(canvas: CanvasDriver) {
	await canvas.page.evaluate((text) => {
		const hook = (
			window as unknown as { __setHarnessDoc?: (docText: string) => void }
		).__setHarnessDoc;
		if (!hook) {
			throw new Error(
				"__setHarnessDoc is undefined (harness hook not installed)",
			);
		}
		hook(text);
	}, docText);
	await expect(canvas.objectById("auto-sticky")).toHaveCount(1);
}

test.describe("sticky fill resolution", () => {
	test("resolves an auto fill to the same theme color a rect resolves it to", async ({
		canvas,
	}) => {
		await loadDoc(canvas);

		const rectFill = await canvas.computedColor("auto-rect", "fill");
		// Positive control: the theme surface is a real color, so "the sticky
		// matches" cannot pass by both being an unpainted default.
		expect(rectFill).not.toBe("");
		expect(await stickyBodyFill(canvas, "auto-sticky")).toBe(rectFill);
	});

	test("draws an omitted fill at the documented default", async ({
		canvas,
	}) => {
		await loadDoc(canvas);

		expect(await stickyBodyFill(canvas, "bare-sticky")).toBe(
			await canvas.normalizeColor("#fef9c3"),
		);
	});
});
