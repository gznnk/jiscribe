import { describe, expect, it } from "vitest";

import { createCanvasRegistries } from "../../../../registries/createCanvasRegistries";
import { DEFAULT_BOTTOM_TOOLBAR_PRESET_IDS } from "../bottomToolbarPresets";
import { resolveBottomToolbarPresets } from "../utils/resolveBottomToolbarPresets";

const { stencil } = createCanvasRegistries();

const presetIdsOf = (
	resolved: ReturnType<typeof resolveBottomToolbarPresets>,
): string[] | null => resolved?.map((preset) => preset.id) ?? null;

describe("resolveBottomToolbarPresets", () => {
	it("shows core's basic presets when the host passes nothing", () => {
		expect(
			presetIdsOf(resolveBottomToolbarPresets(undefined, stencil)),
		).toEqual(["rect", "ellipse", "polygon", "polyline", "text"]);
	});

	it("takes the defaults for whatever the host leaves out", () => {
		expect(presetIdsOf(resolveBottomToolbarPresets({}, stencil))).toEqual([
			...DEFAULT_BOTTOM_TOOLBAR_PRESET_IDS,
		]);
		expect(
			presetIdsOf(resolveBottomToolbarPresets({ show: true }, stencil)),
		).toEqual([...DEFAULT_BOTTOM_TOOLBAR_PRESET_IDS]);
	});

	it("hides the bar with show: false, whatever presets are named", () => {
		expect(
			resolveBottomToolbarPresets(
				{ show: false, presetIds: ["rect"] },
				stencil,
			),
		).toBeNull();
	});

	it("draws the named presets in the declared order", () => {
		expect(
			presetIdsOf(
				resolveBottomToolbarPresets({ presetIds: ["text", "rect"] }, stencil),
			),
		).toEqual(["text", "rect"]);
	});

	it("skips an id naming no registered preset", () => {
		expect(
			presetIdsOf(
				resolveBottomToolbarPresets(
					{ presetIds: ["rect", "no-such-preset"] },
					stencil,
				),
			),
		).toEqual(["rect"]);
	});

	/** The bar still stands, holding the "Other shapes" button alone. */
	it("resolves an empty list to no presets rather than to a hidden bar", () => {
		expect(
			presetIdsOf(resolveBottomToolbarPresets({ presetIds: [] }, stencil)),
		).toEqual([]);
	});

	it("throws when an id is named twice, installed or not", () => {
		expect(() =>
			resolveBottomToolbarPresets({ presetIds: ["rect", "rect"] }, stencil),
		).toThrow(/"rect"/);
		expect(() =>
			resolveBottomToolbarPresets(
				{ presetIds: ["no-such-preset", "no-such-preset"] },
				stencil,
			),
		).toThrow(/"no-such-preset"/);
	});

	it("names only presets the default registries register", () => {
		expect(
			DEFAULT_BOTTOM_TOOLBAR_PRESET_IDS.filter(
				(presetId) => stencil.get(presetId) === undefined,
			),
		).toEqual([]);
	});
});
