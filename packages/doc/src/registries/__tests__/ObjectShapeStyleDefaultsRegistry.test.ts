import { describe, expect, it } from "vitest";

import { DEFAULT_ARROW } from "../../model/objects/base/ArrowStyleDoc";
import {
	DEFAULT_FILL,
	DEFAULT_FILL_OPACITY,
} from "../../model/objects/base/FillStyleDoc";
import { DEFAULT_CORNER_RADIUS } from "../../model/objects/base/RadiusStyleDoc";
import {
	DEFAULT_STROKE_DASH,
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

const styleless = {
	...RectFeatures,
	stroke: false,
	fill: false,
	radius: false,
} as const;

describe("extractShapeStyleDefaults", () => {
	it("takes every enabled group from a type whose features enable them", () => {
		expect(extractShapeStyleDefaults(RectFeatures, RECT_DOC_DEFAULTS)).toEqual({
			stroke: AUTO_COLOR,
			strokeWidth: 2,
			fill: "transparent",
			rx: 0,
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

	it("takes the arrowheads from a type whose features enable them", () => {
		expect(
			extractShapeStyleDefaults(PolylineFeatures, {
				...POLYLINE_DOC_DEFAULTS,
				startArrow: "None",
				endArrow: "FilledTriangle",
			}),
		).toEqual({
			stroke: AUTO_COLOR,
			strokeWidth: 2,
			startArrow: "None",
			endArrow: "FilledTriangle",
		});
	});

	// An ellipse's `rx` is a radius of the shape itself rather than a rounded
	// corner, and `features.radius` is what tells the two apart.
	it("leaves rx out for a type that states one without declaring the radius", () => {
		expect(
			extractShapeStyleDefaults(
				{ ...RectFeatures, radius: false },
				{ ...RECT_DOC_DEFAULTS, rx: 32 },
			),
		).not.toHaveProperty("rx");
	});

	it("returns undefined for a type enabling no group at all", () => {
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
			strokeDashType: DEFAULT_STROKE_DASH,
			strokeOpacity: DEFAULT_STROKE_OPACITY,
			fill: DEFAULT_FILL,
			fillOpacity: DEFAULT_FILL_OPACITY,
			rx: DEFAULT_CORNER_RADIUS,
			startArrow: DEFAULT_ARROW,
			endArrow: DEFAULT_ARROW,
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
			strokeDashType: DEFAULT_STROKE_DASH,
			strokeOpacity: DEFAULT_STROKE_OPACITY,
			fill: "#ff0000",
			fillOpacity: DEFAULT_FILL_OPACITY,
			rx: DEFAULT_CORNER_RADIUS,
			startArrow: DEFAULT_ARROW,
			endArrow: DEFAULT_ARROW,
		});
	});

	it("is not shadowed by a field the object carries as undefined", () => {
		expect(
			registry.resolveShapeStyle("rect", { strokeWidth: undefined })
				.strokeWidth,
		).toBe(4);
	});

	it("reads an undeclared dash as solid", () => {
		expect(registry.resolveShapeStyle("rect", {}).strokeDashType).toBe(
			DEFAULT_STROKE_DASH,
		);
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

	it("answers square corners and bare ends while nobody declares any", () => {
		const style = registry.resolveShapeStyle("rect", {});
		expect(style.rx).toBe(DEFAULT_CORNER_RADIUS);
		expect(style.startArrow).toBe(DEFAULT_ARROW);
		expect(style.endArrow).toBe(DEFAULT_ARROW);
	});

	it("lets a registered type's radius and ends win over the last resort", () => {
		const withRadius = createObjectShapeStyleDefaultsRegistry();
		withRadius.register("rect", { rx: 8, endArrow: "FilledTriangle" });
		const style = withRadius.resolveShapeStyle("rect", {});
		expect(style.rx).toBe(8);
		expect(style.endArrow).toBe("FilledTriangle");
		expect(style.startArrow).toBe(DEFAULT_ARROW);
	});

	it("answers the object's own radius and ends, a radius of 0 included", () => {
		const withRadius = createObjectShapeStyleDefaultsRegistry();
		withRadius.register("rect", { rx: 8 });
		const style = withRadius.resolveShapeStyle("rect", {
			rx: 0,
			startArrow: "Circle",
		});
		expect(style.rx).toBe(0);
		expect(style.startArrow).toBe("Circle");
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
