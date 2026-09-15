import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * Guards that `fillOpacity` / `strokeOpacity` reach the drawn elements.
 *
 * Both are applied through emotion CSS beside the color they belong to, never as
 * SVG presentation attributes (doc 08), so what is read here is the computed
 * style. An arrowhead is not a `<marker>` but an element of its own and takes the
 * line's `strokeOpacity` as its element `opacity`, which is what covers a filled
 * head (the line color goes into `fill`) and a hollow one alike.
 *
 * The fields are optional and default to fully opaque, so an object stating
 * neither is the control.
 */

const docText = JSON.stringify({
	version: 1,
	root: [
		{
			id: "translucent-rect",
			type: "rect",
			x: 120,
			y: 100,
			width: 160,
			height: 100,
			fill: "#ff0000",
			fillOpacity: 0.4,
			stroke: "#0000ff",
			strokeOpacity: 0.7,
		},
		{
			id: "opaque-rect",
			type: "rect",
			x: 400,
			y: 100,
			width: 160,
			height: 100,
			fill: "#ff0000",
			stroke: "#0000ff",
		},
		{
			id: "fading-line",
			type: "polyline",
			points: [
				{ x: 120, y: 300 },
				{ x: 320, y: 300 },
			],
			stroke: "#0000ff",
			strokeOpacity: 0.5,
			endArrow: "FilledTriangle",
		},
		{
			id: "conn-source",
			type: "rect",
			x: 120,
			y: 400,
			width: 80,
			height: 60,
		},
		{
			id: "conn-target",
			type: "rect",
			x: 400,
			y: 400,
			width: 80,
			height: 60,
		},
		{
			id: "fading-connector",
			type: "connector",
			points: [],
			routing: "straight",
			source: { owner: { id: "conn-source" }, anchor: { kind: "center" } },
			target: { owner: { id: "conn-target" }, anchor: { kind: "center" } },
			stroke: "#0000ff",
			strokeOpacity: 0.5,
			endArrow: "FilledTriangle",
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
	await expect(canvas.objectById("translucent-rect")).toHaveCount(1);
}

/** One computed style property of the element carrying the object's own data-id. */
async function computedOf(
	canvas: CanvasDriver,
	id: string,
	property: "fillOpacity" | "strokeOpacity",
): Promise<string> {
	return canvas.page.evaluate(
		({ objectId, styleProperty }) => {
			const el = document.querySelector(`[data-id="${objectId}"][data-kind]`);
			if (!el) {
				throw new Error(`object ${objectId} not found`);
			}
			return getComputedStyle(el)[styleProperty];
		},
		{ objectId: id, styleProperty: property },
	);
}

/**
 * The drawn line's stroke-opacity and the end arrow's element opacity, for a
 * line-like object. The element carrying the data-id is the transparent hit
 * area, so the visible line is found as the sibling polyline carrying no data
 * attributes (the same walk connector-arrow-color makes).
 */
async function readLineOpacities(
	canvas: CanvasDriver,
	kind: "object" | "connector",
	id: string,
): Promise<{ lineStrokeOpacity: string | null; arrowOpacity: string | null }> {
	return canvas.page.evaluate(
		({ dataKind, objectId }) => {
			const hit = document.querySelector(
				`polyline[data-kind="${dataKind}"][data-id="${objectId}"]`,
			);
			const visual = hit?.parentElement
				? [...hit.parentElement.querySelectorAll("polyline")].find(
						(el) =>
							!el.hasAttribute("data-kind") && !el.hasAttribute("data-id"),
					)
				: null;
			const arrow = document.querySelector(
				`polygon[data-kind="${dataKind}"][data-id="${objectId}"]`,
			);
			return {
				lineStrokeOpacity: visual
					? getComputedStyle(visual).strokeOpacity
					: null,
				arrowOpacity: arrow ? getComputedStyle(arrow).opacity : null,
			};
		},
		{ dataKind: kind, objectId: id },
	);
}

test.describe("paint opacity", () => {
	test("draws a shape with the fill and stroke opacities it states", async ({
		canvas,
	}) => {
		await loadDoc(canvas);

		expect(await computedOf(canvas, "translucent-rect", "fillOpacity")).toBe(
			"0.4",
		);
		expect(await computedOf(canvas, "translucent-rect", "strokeOpacity")).toBe(
			"0.7",
		);
	});

	test("states the opacities in CSS only, never as attributes", async ({
		canvas,
	}) => {
		await loadDoc(canvas);

		const attributes = await canvas.page.evaluate(() => {
			const namesOf = (selector: string): string[] => {
				const el = document.querySelector(selector);
				if (!el) {
					throw new Error(`no element matches ${selector}`);
				}
				return [...el.attributes].map((attribute) => attribute.name);
			};
			return {
				shape: namesOf('[data-id="translucent-rect"][data-kind]'),
				arrow: namesOf(
					'polygon[data-kind="connector"][data-id="fading-connector"]',
				),
			};
		});
		expect(attributes.shape).not.toContain("fill-opacity");
		expect(attributes.shape).not.toContain("stroke-opacity");
		expect(attributes.arrow).not.toContain("opacity");
	});

	test("draws a shape stating neither opacity fully opaque", async ({
		canvas,
	}) => {
		await loadDoc(canvas);

		expect(await computedOf(canvas, "opaque-rect", "fillOpacity")).toBe("1");
		expect(await computedOf(canvas, "opaque-rect", "strokeOpacity")).toBe("1");
	});

	test("fades a polyline's end arrow with the line itself", async ({
		canvas,
	}) => {
		await loadDoc(canvas);

		const line = await readLineOpacities(canvas, "object", "fading-line");
		expect(line.lineStrokeOpacity).toBe("0.5");
		expect(line.arrowOpacity).toBe("0.5");
	});

	test("fades a connector's end arrow with the line itself", async ({
		canvas,
	}) => {
		await loadDoc(canvas);

		const connector = await readLineOpacities(
			canvas,
			"connector",
			"fading-connector",
		);
		expect(connector.lineStrokeOpacity).toBe("0.5");
		expect(connector.arrowOpacity).toBe("0.5");
	});
});
