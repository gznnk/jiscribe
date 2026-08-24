import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";
import { describe, it, expect } from "vitest";

import { createPolyStateValidator } from "../createPolyStateValidator";

/**
 * Tests the generator itself rather than any one shape: per-shape suites
 * (validatePolygonState, ...) pin down one features combination each, so the
 * feature gating — "a disabled group is not validated at all" — is only
 * observable here.
 */
const features = (
	extra: Partial<Omit<ObjectFeatures, "geometry">> = {},
): ObjectFeatures & { geometry: "poly" } => ({
	type: "polygon",
	geometry: "poly",
	...extra,
});

const pts = (n: number): { x: number; y: number }[] =>
	Array.from({ length: n }, (_, i) => ({ x: i, y: i }));

const validPoly = { id: "poly-1", type: "polygon", points: pts(3) };

describe("createPolyStateValidator id / type / points", () => {
	const isValid = createPolyStateValidator(features(), 3);

	it("accepts a well-formed poly of at least minPoints", () => {
		expect(isValid(validPoly)).toBe(true);
	});

	it("rejects a non-object, a wrong type, and too few points", () => {
		expect(isValid(null)).toBe(false);
		expect(isValid({ ...validPoly, type: "polyline" })).toBe(false);
		expect(isValid({ ...validPoly, points: pts(2) })).toBe(false);
	});

	it("accepts an empty points array when minPoints is 0 (connector waypoints)", () => {
		const isWaypointsValid = createPolyStateValidator(
			features({ type: "connector" }),
			0,
		);
		expect(isWaypointsValid({ id: "c-1", type: "connector", points: [] })).toBe(
			true,
		);
	});
});

describe("createPolyStateValidator feature gating", () => {
	/** One malformed value per optional group, all present at once. */
	const brokenStyles = {
		stroke: "url(javascript:alert(1))",
		fill: "url(javascript:alert(1))",
		startArrow: "NotAnArrow",
	};

	it("ignores every style group when all flags are off", () => {
		const isValid = createPolyStateValidator(features(), 3);
		expect(isValid({ ...validPoly, ...brokenStyles })).toBe(true);
	});

	it.each([
		["stroke", { stroke: true }],
		["fill", { fill: true }],
		["arrow", { arrow: true }],
	] as [string, Partial<ObjectFeatures>][])(
		"rejects a malformed %s group once the flag is on",
		(_flag, flags) => {
			const isValid = createPolyStateValidator(features(flags), 3);
			expect(isValid({ ...validPoly, ...brokenStyles })).toBe(false);
		},
	);

	it("accepts well-formed values for every enabled group", () => {
		const isValid = createPolyStateValidator(
			features({ stroke: true, fill: true, arrow: true }),
			3,
		);
		expect(
			isValid({
				...validPoly,
				stroke: "#000",
				strokeWidth: 2,
				strokeDashType: "dashed",
				fill: "#fff",
				startArrow: "OpenArrow",
				endArrow: "None",
			}),
		).toBe(true);
	});
});

describe("createPolyStateValidator extra predicate", () => {
	it("runs the shape-specific extra check after the feature groups", () => {
		const isValid = createPolyStateValidator(
			features(),
			3,
			(o) => o.id !== "rejected",
		);
		expect(isValid(validPoly)).toBe(true);
		expect(isValid({ ...validPoly, id: "rejected" })).toBe(false);
	});
});
