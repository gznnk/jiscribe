import { describe, it, expect } from "vitest";

import type { SemanticDiagnostic } from "../../../types/SemanticDiagnostic";
import type { ObjectFeatures } from "../../types/ObjectFeatures";
import { createFrameDocValidator } from "../createFrameDocValidator";

/**
 * Tests the generator itself rather than any one shape: per-shape suites
 * (validateRectDoc, ...) pin down one features combination each, so the
 * feature gating — "a disabled group is not validated at all" — is only
 * observable here.
 */
const features = (extra: Partial<ObjectFeatures> = {}): ObjectFeatures => ({
	type: "rect",
	geometry: "rect",
	...extra,
});

const paths = (errors: SemanticDiagnostic[]): string[] =>
	errors.map((e) => e.path);

describe("createFrameDocValidator geometry", () => {
	it("requires x/y/width/height for rect geometry", () => {
		const validate = createFrameDocValidator(features());
		expect(paths(validate({}, "root"))).toEqual([
			"root.x",
			"root.y",
			"root.width",
			"root.height",
		]);
	});

	it("requires cx/cy/rx/ry for ellipse geometry", () => {
		const validate = createFrameDocValidator(
			features({ type: "ellipse", geometry: "ellipse" }),
		);
		expect(paths(validate({}, "root"))).toEqual([
			"root.cx",
			"root.cy",
			"root.rx",
			"root.ry",
		]);
	});

	it("requires x/y alone for point geometry, whose size is derived", () => {
		const validate = createFrameDocValidator(
			features({ type: "text", geometry: "point" }),
		);
		expect(paths(validate({}, "root"))).toEqual(["root.x", "root.y"]);
		expect(validate({ x: -10, y: -20 }, "root")).toEqual([]);
	});

	it("requires a points array for poly geometry", () => {
		const validate = createFrameDocValidator(
			features({ type: "polyline", geometry: "poly" }),
		);
		expect(paths(validate({}, "root"))).toEqual(["root.points"]);
	});

	it("rejects negative width/height but allows negative x/y", () => {
		const validate = createFrameDocValidator(features());
		const errors = validate({ x: -10, y: -20, width: -1, height: -1 }, "root");
		expect(paths(errors)).toEqual(["root.width", "root.height"]);
	});

	it("rejects negative radii but allows negative cx/cy", () => {
		const validate = createFrameDocValidator(
			features({ type: "ellipse", geometry: "ellipse" }),
		);
		const errors = validate({ cx: -10, cy: -20, rx: -1, ry: -1 }, "root");
		expect(paths(errors)).toEqual(["root.rx", "root.ry"]);
	});

	it("prefixes every diagnostic with the given path", () => {
		const validate = createFrameDocValidator(features());
		const errors = validate({}, "root.children[2]");
		expect(paths(errors)).toContain("root.children[2].x");
	});
});

describe("createFrameDocValidator feature gating", () => {
	const geometry = { x: 0, y: 0, width: 10, height: 10 };
	/** One malformed value per optional style group, all present at once. */
	const brokenStyles = {
		rotation: "0",
		stroke: "url(javascript:alert(1))",
		fill: "url(javascript:alert(1))",
		textAlign: "justify",
		rx: -1,
	};

	it("reports nothing beyond geometry when every flag is off", () => {
		const validate = createFrameDocValidator(features());
		expect(validate({ ...geometry, ...brokenStyles }, "root")).toEqual([]);
	});

	it.each([
		["transform", { transform: true }, "root.rotation"],
		["stroke", { stroke: true }, "root.stroke"],
		["fill", { fill: true }, "root.fill"],
		["text", { text: "body" }, "root.textAlign"],
		["radius", { radius: true }, "root.rx"],
	] as [string, Partial<ObjectFeatures>, string][])(
		"validates %s fields only when the flag is on",
		(_flag, flags, path) => {
			const validate = createFrameDocValidator(features(flags));
			expect(paths(validate({ ...geometry, ...brokenStyles }, "root"))).toEqual(
				[path],
			);
		},
	);

	it("composes every enabled group", () => {
		const validate = createFrameDocValidator(
			features({
				transform: true,
				stroke: true,
				fill: true,
				text: "body",
				radius: true,
			}),
		);
		expect(paths(validate({ ...geometry, ...brokenStyles }, "root"))).toEqual([
			"root.rotation",
			"root.stroke",
			"root.fill",
			"root.textAlign",
			"root.rx",
		]);
	});
});

describe("createFrameDocValidator extra validator", () => {
	const extra = (o: Record<string, unknown>, path: string) =>
		"tail" in o ? [] : [{ path: `${path}.tail`, message: "is required" }];

	it("appends the extra diagnostics after the generated ones", () => {
		const validate = createFrameDocValidator(features(), extra);
		expect(paths(validate({}, "root"))).toEqual([
			"root.x",
			"root.y",
			"root.width",
			"root.height",
			"root.tail",
		]);
	});

	it("is the only source of error when everything else is valid", () => {
		const validate = createFrameDocValidator(features(), extra);
		const doc = { x: 0, y: 0, width: 10, height: 10 };
		expect(paths(validate(doc, "root"))).toEqual(["root.tail"]);
		expect(validate({ ...doc, tail: null }, "root")).toEqual([]);
	});
});
