import { describe, expect, it } from "vitest";

import {
	DEFAULT_FILL,
	DEFAULT_FILL_OPACITY,
} from "../../model/objects/base/FillStyleDoc";
import {
	DEFAULT_STROKE_OPACITY,
	DEFAULT_STROKE_WIDTH,
} from "../../model/objects/base/StrokeStyleDoc";
import {
	PolylineFeatures,
	POLYLINE_DOC_DEFAULTS,
} from "../../model/objects/primitives/polyline/PolylineDoc";
import {
	RectFeatures,
	RECT_DOC_DEFAULTS,
} from "../../model/objects/primitives/rect/RectDoc";
import { AUTO_COLOR } from "../../model/objects/utils/autoColor";
import { SHAPE_STYLE_FALLBACK } from "../../model/objects/utils/shapeStyleFallback";
import {
	createObjectShapeStyleDefaultsRegistry,
	extractShapeStyleDefaults,
} from "../ObjectShapeStyleDefaultsRegistry";

const styleless = { ...RectFeatures, stroke: false, fill: false } as const;

describe("extractShapeStyleDefaults", () => {
	it("takes both groups from a type whose features enable both", () => {
		expect(extractShapeStyleDefaults(RectFeatures, RECT_DOC_DEFAULTS)).toEqual({
			stroke: AUTO_COLOR,
			strokeWidth: 2,
			fill: "transparent",
		});
	});

	it("leaves the fill out for a stroke-only type that states one", () => {
		const defaults = extractShapeStyleDefaults(PolylineFeatures, {
			...POLYLINE_DOC_DEFAULTS,
			fill: "#ff0000",
		});
		expect(defaults).toEqual({ stroke: AUTO_COLOR, strokeWidth: 2 });
		expect(defaults).not.toHaveProperty("fill");
	});

	it("returns undefined for a type enabling neither group", () => {
		expect(
			extractShapeStyleDefaults(styleless, RECT_DOC_DEFAULTS),
		).toBeUndefined();
	});

	it("returns undefined for a type that declares no defaults at all", () => {
		expect(extractShapeStyleDefaults(RectFeatures, undefined)).toBeUndefined();
	});

	it("returns undefined when the defaults set no style field", () => {
		expect(
			extractShapeStyleDefaults(RectFeatures, { type: "rect", x: 0, y: 0 }),
		).toBeUndefined();
	});
});

describe("ObjectShapeStyleDefaultsRegistry.resolveShapeStyle", () => {
	const registry = createObjectShapeStyleDefaultsRegistry();
	registry.register("markdown", { fill: AUTO_COLOR });
	registry.register("rect", {
		stroke: AUTO_COLOR,
		strokeWidth: 4,
		fill: "transparent",
	});

	it("falls to the shared last resort for an unregistered type", () => {
		expect(registry.resolveShapeStyle("connector", {})).toEqual({
			stroke: SHAPE_STYLE_FALLBACK.stroke,
			strokeWidth: DEFAULT_STROKE_WIDTH,
			strokeDashType: undefined,
			strokeOpacity: DEFAULT_STROKE_OPACITY,
			fill: DEFAULT_FILL,
			fillOpacity: DEFAULT_FILL_OPACITY,
		});
	});

	it("lets a registered type's auto fill win over the transparent last resort", () => {
		expect(registry.resolveShapeStyle("markdown", {}).fill).toBe(AUTO_COLOR);
	});

	it("keeps the last resort for a group the registered type says nothing about", () => {
		expect(registry.resolveShapeStyle("markdown", {}).strokeWidth).toBe(
			DEFAULT_STROKE_WIDTH,
		);
	});

	it("lets the object's own field win over its type's default", () => {
		expect(
			registry.resolveShapeStyle("rect", { strokeWidth: 1, fill: "#ff0000" }),
		).toEqual({
			stroke: AUTO_COLOR,
			strokeWidth: 1,
			strokeDashType: undefined,
			strokeOpacity: DEFAULT_STROKE_OPACITY,
			fill: "#ff0000",
			fillOpacity: DEFAULT_FILL_OPACITY,
		});
	});

	it("is not shadowed by a field the object carries as undefined", () => {
		expect(
			registry.resolveShapeStyle("rect", { strokeWidth: undefined })
				.strokeWidth,
		).toBe(4);
	});

	it("leaves the dash unset when neither side declares one", () => {
		expect(
			registry.resolveShapeStyle("rect", {}).strokeDashType,
		).toBeUndefined();
	});

	it("answers the object's own dash", () => {
		expect(
			registry.resolveShapeStyle("rect", { strokeDashType: "dashed" })
				.strokeDashType,
		).toBe("dashed");
	});

	// Unlike the dash, an omitted opacity resolves to a number: the drawing side
	// has to emit one either way.
	it("answers a full opacity while nobody declares one", () => {
		const style = registry.resolveShapeStyle("rect", {});
		expect(style.fillOpacity).toBe(DEFAULT_FILL_OPACITY);
		expect(style.strokeOpacity).toBe(DEFAULT_STROKE_OPACITY);
	});

	it("answers the object's own opacities, a fully transparent one included", () => {
		const style = registry.resolveShapeStyle("rect", {
			fillOpacity: 0,
			strokeOpacity: 0.25,
		});
		expect(style.fillOpacity).toBe(0);
		expect(style.strokeOpacity).toBe(0.25);
	});
});

describe("ObjectShapeStyleDefaultsRegistry.registerDefinition", () => {
	it("registers what the definition's defaults declare", () => {
		const registry = createObjectShapeStyleDefaultsRegistry();
		registry.registerDefinition("markdown", {
			features: RectFeatures,
			defaults: { type: "markdown", fill: AUTO_COLOR, strokeWidth: 3 },
		});
		expect(registry.get("markdown")).toEqual({
			fill: AUTO_COLOR,
			strokeWidth: 3,
		});
	});

	it("registers nothing for a definition declaring no defaults", () => {
		const registry = createObjectShapeStyleDefaultsRegistry();
		registry.registerDefinition("connector", { features: RectFeatures });
		expect(registry.get("connector")).toBeUndefined();
	});
});
