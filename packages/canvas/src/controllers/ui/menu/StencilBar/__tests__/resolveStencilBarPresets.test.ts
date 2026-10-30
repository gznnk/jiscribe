import { describe, expect, it } from "vitest";

import { createCanvasRegistries } from "../../../../registries/createCanvasRegistries";
import { DEFAULT_STENCIL_BAR_PRESET_IDS } from "../stencilBarPresets";
import { resolveStencilBarPresets } from "../utils/resolveStencilBarPresets";

const { stencil } = createCanvasRegistries();

const presetIdsOf = (
	resolved: ReturnType<typeof resolveStencilBarPresets>,
): string[] | null => resolved?.map((preset) => preset.id) ?? null;

describe("resolveStencilBarPresets", () => {
	it("shows core's basic presets when the host passes nothing", () => {
		expect(presetIdsOf(resolveStencilBarPresets(undefined, stencil))).toEqual([
			"rect",
			"ellipse",
			"polygon",
			"polyline",
			"text",
		]);
	});

	it("takes the defaults for whatever the host leaves out", () => {
		expect(presetIdsOf(resolveStencilBarPresets({}, stencil))).toEqual([
			...DEFAULT_STENCIL_BAR_PRESET_IDS,
		]);
		expect(
			presetIdsOf(resolveStencilBarPresets({ show: true }, stencil)),
		).toEqual([...DEFAULT_STENCIL_BAR_PRESET_IDS]);
	});

	it("hides the bar with show: false, whatever presets are named", () => {
		expect(
			resolveStencilBarPresets({ show: false, presetIds: ["rect"] }, stencil),
		).toBeNull();
	});

	it("draws the named presets in the declared order", () => {
		expect(
			presetIdsOf(
				resolveStencilBarPresets({ presetIds: ["text", "rect"] }, stencil),
			),
		).toEqual(["text", "rect"]);
	});

	it("skips an id naming no registered preset", () => {
		expect(
			presetIdsOf(
				resolveStencilBarPresets(
					{ presetIds: ["rect", "no-such-preset"] },
					stencil,
				),
			),
		).toEqual(["rect"]);
	});

	/** The bar still stands, holding the "Other shapes" button alone. */
	it("resolves an empty list to no presets rather than to a hidden bar", () => {
		expect(
			presetIdsOf(resolveStencilBarPresets({ presetIds: [] }, stencil)),
		).toEqual([]);
	});

	it("throws when an id is named twice, installed or not", () => {
		expect(() =>
			resolveStencilBarPresets({ presetIds: ["rect", "rect"] }, stencil),
		).toThrow(/"rect"/);
		expect(() =>
			resolveStencilBarPresets(
				{ presetIds: ["no-such-preset", "no-such-preset"] },
				stencil,
			),
		).toThrow(/"no-such-preset"/);
	});

	it("names only presets the default registries register", () => {
		expect(
			DEFAULT_STENCIL_BAR_PRESET_IDS.filter(
				(presetId) => stencil.get(presetId) === undefined,
			),
		).toEqual([]);
	});
});
