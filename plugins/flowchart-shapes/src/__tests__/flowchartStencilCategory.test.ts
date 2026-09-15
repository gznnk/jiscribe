import { createCanvasRegistries } from "@jiscribe/canvas";
import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/canvas-sdk/doc";
import { describe, expect, it } from "vitest";

import { flowchartPlugin } from "../plugin";
import { flowchartStencilCategory } from "../stencil/FlowchartStencilCategory";

/**
 * A presetId naming no registered preset is silently skipped at render time, so
 * a stale id would only show up as a missing button. The registries are built
 * with the plugin applied on top of the core defaults, i.e. the same resolution
 * a host performs — an id this package stops registering, or a core preset
 * renamed out from under `process` / `onPageConnector`, fails here.
 *
 * The other direction matters just as much: a shape registered in `objects` but
 * missing from the flyout is reachable only by hand-writing JSON. Neither the
 * plugin nor the category can catch that alone, since a new shape that is simply
 * forgotten in both stays consistent with itself.
 */
// Building the registries evaluates every definition's text region, and the two
// marker shapes size a below-the-box label from its own text, so this measures.
// Text measurement is offered, never inferred, and measuring with nothing
// offered throws (see @jiscribe/canvas-sdk/doc); without a browser these run on
// the estimate, stated here rather than left to a fallback.
offerTextMeasurement(createEstimateTextMeasurement());

const presetIds = (): readonly string[] => flowchartStencilCategory.presetIds;

describe("flowchartStencilCategory", () => {
	it("names only presets a canvas with this plugin applied registers", () => {
		const { stencil } = createCanvasRegistries({ plugins: [flowchartPlugin] });
		const unresolved = presetIds().filter(
			(presetId) => stencil.get(presetId) === undefined,
		);
		expect(unresolved).toEqual([]);
	});

	it("offers every shape this package registers", () => {
		const { stencil } = createCanvasRegistries({ plugins: [flowchartPlugin] });
		// A stencil names the type it places, so the flyout is checked against the
		// types it actually reaches rather than against the preset ids themselves.
		const offered = new Set(
			presetIds().flatMap((presetId) => {
				const preset = stencil.get(presetId);
				return preset ? [preset.objectType] : [];
			}),
		);
		const missing = Object.keys(flowchartPlugin.objects ?? {}).filter(
			(type) => !offered.has(type),
		);
		expect(missing).toEqual([]);
	});

	it("borrows the core types for the two presets that have no type of their own", () => {
		// The flowchart roles process / on-page connector are a rect and an
		// ellipse; only the preset carries the meaning. Registering a type for
		// either would be a change of that decision, not a refinement of it.
		const { stencil } = createCanvasRegistries({ plugins: [flowchartPlugin] });
		expect(stencil.get("process")?.objectType).toBe("rect");
		expect(stencil.get("onPageConnector")?.objectType).toBe("ellipse");
	});

	it("lists each preset once, so the flyout has no duplicate button", () => {
		expect(new Set(presetIds()).size).toBe(presetIds().length);
	});
});
