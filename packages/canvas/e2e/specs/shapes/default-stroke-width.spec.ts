import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Guards that a document omitting `strokeWidth` is drawn at the schema's
 * documented default (2), not the SVG default of 1 the attribute's absence
 * would fall back to. Editor-created shapes always carry an explicit value
 * (the ObjectFactory copies it from the DOC_DEFAULTS), so only documents
 * written directly — by hand or by an AI — exercise the absent field; this
 * spec injects such a document through the harness's doc hook.
 *
 * An explicit width in the same document is the positive control: resolution
 * must fill the absence, never override what the document says.
 */

const docText = JSON.stringify({
	version: 1,
	root: [
		{ id: "bare-rect", type: "rect", x: 150, y: 150, width: 160, height: 100 },
		{
			id: "wide-rect",
			type: "rect",
			x: 400,
			y: 150,
			width: 160,
			height: 100,
			strokeWidth: 5,
		},
		{
			id: "bare-polyline",
			type: "polyline",
			points: [
				{ x: 150, y: 340 },
				{ x: 560, y: 340 },
			],
		},
		{
			id: "bare-connector",
			type: "connector",
			points: [],
			source: {
				owner: { id: "bare-rect" },
				anchor: { kind: "connectPoint", id: "rightCenter" },
			},
			target: {
				owner: { id: "wide-rect" },
				anchor: { kind: "connectPoint", id: "leftCenter" },
			},
		},
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
	await expect(canvas.objectById("bare-rect")).toHaveCount(1);
}

/**
 * The drawn element's stroke-width attribute: read off the object itself when it
 * carries one, else off the one descendant that does (a connector's visible
 * polyline), else off the next sibling (a polyline renders its data-id on the
 * hit area and draws the visible line as the sibling right after it).
 */
async function strokeWidthOf(
	canvas: CanvasDriver,
	id: string,
): Promise<string | null> {
	return canvas.page.evaluate((objectId) => {
		const el = document.querySelector(`[data-id="${objectId}"][data-kind]`);
		if (!el) {
			throw new Error(`object ${objectId} not found`);
		}
		const drawn = el.hasAttribute("stroke-width")
			? el
			: (el.querySelector("[stroke-width]") ??
				(el.nextElementSibling?.hasAttribute("stroke-width")
					? el.nextElementSibling
					: null));
		return drawn ? drawn.getAttribute("stroke-width") : null;
	}, id);
}

test.describe("default stroke width", () => {
	test("draws an omitted strokeWidth at the documented default of 2", async ({
		canvas,
	}) => {
		await loadDoc(canvas);

		expect(await strokeWidthOf(canvas, "bare-rect")).toBe("2");
		expect(await strokeWidthOf(canvas, "bare-polyline")).toBe("2");
		expect(await strokeWidthOf(canvas, "bare-connector")).toBe("2");
	});

	test("leaves an explicit strokeWidth untouched", async ({ canvas }) => {
		await loadDoc(canvas);

		expect(await strokeWidthOf(canvas, "wide-rect")).toBe("5");
	});
});
