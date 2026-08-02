import { createCanvasRegistries } from "@workspace/canvas";
import { describe, expect, it } from "vitest";

import { generalPlugin } from "../plugin";
import { generalToolbarEntry } from "../stencil/GeneralToolbarEntry";

/**
 * A presetId naming no registered preset is silently skipped at render time, so
 * a stale id would only show up as a missing button. The entry mixes owners —
 * `cloud` is still core's, `actor` is this package's — which is exactly the case
 * a single-package check would miss, so the registries are built with the plugin
 * applied on top of the core defaults.
 */
describe("generalToolbarEntry", () => {
	it("names only presets a canvas with this plugin applied registers", () => {
		const { stencil } = createCanvasRegistries({ plugins: [generalPlugin] });
		expect(generalToolbarEntry.kind).toBe("category");
		if (generalToolbarEntry.kind !== "category") {
			return;
		}
		const unresolved = generalToolbarEntry.presetIds.filter(
			(presetId) => stencil.get(presetId) === undefined,
		);
		expect(unresolved).toEqual([]);
	});
});
