import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";
import { test, expect } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * `fill: "auto"` on a sticky must follow the theme like it does on every other
 * shape (#38 / #206). The paper color is drawn by hand here rather than through
 * createFrameObject, so the resolution has to be repeated by this package —
 * and while it was applied as an SVG `fill` attribute, "auto" reached the
 * browser as an invalid paint and the note lost its color.
 *
 * The rect in the same document is the reference: both fields are the same
 * "surface"-role color, so whatever the theme resolves to, the two must agree.
 * The menu offers presets only, so an "auto" sticky can only arrive from a
 * document written directly — by hand or by an AI — hence the doc hook.
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

/** The computed fill of the sticky body (the second polygon; the first is the shadow). */
async function stickyBodyFill(canvas: CanvasDriver): Promise<string | null> {
	return canvas.page.evaluate(() => {
		const group = document.querySelector('[data-id="auto-sticky"]');
		const polygons = group ? [...group.querySelectorAll("polygon")] : [];
		const body = polygons[1];
		return body ? getComputedStyle(body).fill : null;
	});
}

test.describe("sticky auto fill", () => {
	test("resolves an auto fill to the same theme color a rect resolves it to", async ({
		canvas,
	}) => {
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

		const rectFill = await canvas.computedColor("auto-rect", "fill");
		// Positive control: the theme surface is a real color, so "the sticky
		// matches" cannot pass by both being an unpainted default.
		expect(rectFill).not.toBe("");
		expect(await stickyBodyFill(canvas)).toBe(rectFill);
	});
});
