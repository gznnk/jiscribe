import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Guards that a document omitting `fill` is drawn with the fill its own type
 * declares, not the shared "transparent" every type used to fall to. The spec
 * plugin's `panel` is the type declaring `"auto"` (PANEL_DOC_DEFAULTS), so an
 * omitted fill has to come out as the very color a written `"auto"` does; `rect`,
 * whose own default is transparent, is the control that the resolution reads the
 * type rather than filling every shape in.
 *
 * Editor-created shapes always carry an explicit value (the ObjectFactory copies
 * it from the DOC_DEFAULTS), so only documents written directly — by hand or by
 * an AI — exercise the absent field; this spec injects such a document through
 * the harness's doc hook.
 */

const TRANSPARENT = "rgba(0, 0, 0, 0)";

const docText = JSON.stringify({
	version: 1,
	root: [
		{
			id: "bare-panel",
			type: "panel",
			x: 150,
			y: 150,
			width: 160,
			height: 100,
		},
		{
			id: "auto-panel",
			type: "panel",
			x: 400,
			y: 150,
			width: 160,
			height: 100,
			fill: "auto",
		},
		{
			id: "red-panel",
			type: "panel",
			x: 150,
			y: 320,
			width: 160,
			height: 100,
			fill: "#ff0000",
		},
		{ id: "bare-rect", type: "rect", x: 400, y: 320, width: 160, height: 100 },
	],
});

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
	await expect(canvas.objectById("bare-panel")).toHaveCount(1);
}

/**
 * The fill the browser resolved for the drawn element: the computed value, so a
 * `var(--jiscribe-*)` token comes back as the color it stands for rather than as
 * the token text.
 */
async function computedFillOf(
	canvas: CanvasDriver,
	id: string,
): Promise<string> {
	return canvas.page.evaluate((objectId) => {
		const el = document.querySelector(`[data-id="${objectId}"][data-kind]`);
		if (!el) {
			throw new Error(`object ${objectId} not found`);
		}
		return getComputedStyle(el).fill;
	}, id);
}

test.describe("default fill", () => {
	test("draws an omitted fill as the type's own documented default", async ({
		canvas,
	}) => {
		await loadDoc(canvas);

		const surfaceFill = await computedFillOf(canvas, "auto-panel");
		expect(surfaceFill).not.toBe(TRANSPARENT);
		expect(await computedFillOf(canvas, "bare-panel")).toBe(surfaceFill);
	});

	test("leaves an explicit fill untouched", async ({ canvas }) => {
		await loadDoc(canvas);

		expect(await computedFillOf(canvas, "red-panel")).toBe("rgb(255, 0, 0)");
	});

	test("keeps a rect transparent, its own default being transparent", async ({
		canvas,
	}) => {
		await loadDoc(canvas);

		expect(await computedFillOf(canvas, "bare-rect")).toBe(TRANSPARENT);
	});
});
