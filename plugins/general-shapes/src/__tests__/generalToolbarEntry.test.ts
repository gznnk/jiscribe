import { createCanvasRegistries } from "@workspace/canvas";
import { describe, expect, it } from "vitest";

import { generalPlugin } from "../plugin";
import { generalToolbarEntry } from "../stencil/GeneralToolbarEntry";

/**
 * A presetId naming no registered preset is silently skipped at render time, so
 * a stale id would only show up as a missing button. The registries are built
 * with the plugin applied on top of the core defaults, i.e. the same resolution
 * a host performs — an id this package stops registering fails here.
 *
 * The other direction matters just as much: a shape registered in `objects` but
 * missing from the flyout is reachable only by hand-writing JSON. Neither the
 * plugin nor the toolbar entry can catch that alone, since a new shape that is
 * simply forgotten in both stays consistent with itself.
 */
const presetIds = (): readonly string[] =>
	generalToolbarEntry.kind === "category" ? generalToolbarEntry.presetIds : [];

describe("generalToolbarEntry", () => {
	it("names only presets a canvas with this plugin applied registers", () => {
		const { stencil } = createCanvasRegistries({ plugins: [generalPlugin] });
		expect(generalToolbarEntry.kind).toBe("category");
		const unresolved = presetIds().filter(
			(presetId) => stencil.get(presetId) === undefined,
		);
		expect(unresolved).toEqual([]);
	});

	it("offers every shape this package registers", () => {
		const { stencil } = createCanvasRegistries({ plugins: [generalPlugin] });
		// A stencil names the type it places, so the flyout is checked against the
		// types it actually reaches rather than against the preset ids themselves.
		const offered = new Set(
			presetIds().flatMap((presetId) => {
				const preset = stencil.get(presetId);
				return preset ? [preset.objectType] : [];
			}),
		);
		const missing = Object.keys(generalPlugin.objects ?? {}).filter(
			(type) => !offered.has(type),
		);
		expect(missing).toEqual([]);
	});
});
