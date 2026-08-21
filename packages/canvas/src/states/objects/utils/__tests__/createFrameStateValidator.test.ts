import { describe, it, expect } from "vitest";

import type { ObjectFeatures } from "../../../../schemas/objects/types/ObjectFeatures";
import { createFrameStateValidator } from "../createFrameStateValidator";
import type { StateRecord } from "../validateStateUtils";

/**
 * Tests the generator itself rather than any one shape: per-shape suites
 * (validateRectState, ...) pin down one features combination each, so the
 * feature gating — "a disabled group is not validated at all" — is only
 * observable here.
 */
const features = (extra: Partial<ObjectFeatures> = {}): ObjectFeatures => ({
	type: "rect",
	geometry: "rect",
	...extra,
});

const validFrame = {
	id: "rect-1",
	type: "rect",
	cx: 10,
	cy: 20,
	width: 100,
	height: 50,
};

describe("createFrameStateValidator id / type / frame", () => {
	const isValid = createFrameStateValidator(features());

	it("accepts a minimal frame state", () => {
		expect(isValid(validFrame)).toBe(true);
	});

	it("rejects non-objects, including arrays", () => {
		for (const value of [null, undefined, 42, "rect", [], () => {}]) {
			expect(isValid(value)).toBe(false);
		}
	});

	it("rejects a missing or empty id", () => {
		expect(isValid({ ...validFrame, id: undefined })).toBe(false);
		expect(isValid({ ...validFrame, id: "" })).toBe(false);
	});

	it("rejects a type that does not match the features type", () => {
		expect(isValid({ ...validFrame, type: "ellipse" })).toBe(false);
	});

	it("rejects non-numeric or negatively sized geometry", () => {
		expect(isValid({ ...validFrame, cx: "10" })).toBe(false);
		expect(isValid({ ...validFrame, width: -1 })).toBe(false);
		expect(isValid({ ...validFrame, height: undefined })).toBe(false);
	});

	it("allows negative positions", () => {
		expect(isValid({ ...validFrame, cx: -10, cy: -20 })).toBe(true);
	});
});

describe("createFrameStateValidator feature gating", () => {
	/** One malformed value per optional group, all present at once. */
	const brokenStyles = {
		rotation: "0",
		scaleX: 1,
		scaleY: 1,
		stroke: "url(javascript:alert(1))",
		fill: "url(javascript:alert(1))",
		text: { body: { text: "hello", fontSize: 0 } },
		rx: -1,
		startArrow: "NotAnArrow",
	};

	it("ignores every style group when all flags are off", () => {
		const isValid = createFrameStateValidator(features());
		expect(isValid({ ...validFrame, ...brokenStyles })).toBe(true);
	});

	it.each([
		["transform", { transform: true }],
		["stroke", { stroke: true }],
		["fill", { fill: true }],
		["text", { text: "body" }],
		["radius", { radius: true }],
		["arrow", { arrow: true }],
	] as [string, Partial<ObjectFeatures>][])(
		"rejects a malformed %s group once the flag is on",
		(_flag, flags) => {
			const isValid = createFrameStateValidator(features(flags));
			expect(isValid({ ...validFrame, ...brokenStyles })).toBe(false);
		},
	);

	// The slot keys are the authority on a shape's slots, so a "body" type whose
	// state skipped the mapper must not pass: the extra key would be drawn and
	// editable, then dropped on save (issue #235).
	it.each([
		["no text at all", {}],
		["an empty slot map", { text: {} }],
		["a slot other than body", { text: { weird: { text: "x" } } }],
		[
			"an extra slot beside body",
			{ text: { body: { text: "hi" }, weird: { text: "x" } } },
		],
	])("rejects a body type with %s", (_label, textState) => {
		const isValid = createFrameStateValidator(features({ text: "body" }));
		expect(isValid({ ...validFrame, ...textState })).toBe(false);
	});

	it("accepts well-formed values for every enabled group", () => {
		const isValid = createFrameStateValidator(
			features({
				transform: true,
				stroke: true,
				fill: true,
				text: "body",
				radius: true,
				arrow: true,
			}),
		);
		expect(
			isValid({
				...validFrame,
				rotation: 45,
				scaleX: 1,
				scaleY: -1,
				stroke: "#000",
				strokeWidth: 2,
				strokeDashType: "dashed",
				fill: "#fff",
				text: {
					body: {
						text: "hello",
						fontSize: 16,
						fontFamily: "Noto Sans JP",
						fontWeight: "normal",
					},
				},
				rx: 4,
				startArrow: "OpenArrow",
				endArrow: "None",
			}),
		).toBe(true);
	});
});

describe("createFrameStateValidator extra predicate", () => {
	const hasTail = (o: StateRecord) => "tail" in o;

	it("rejects when the extra predicate fails, even with a valid frame", () => {
		const isValid = createFrameStateValidator(features(), hasTail);
		expect(isValid(validFrame)).toBe(false);
		expect(isValid({ ...validFrame, tail: {} })).toBe(true);
	});

	it("does not run the extra predicate once an earlier check fails", () => {
		let called = false;
		const isValid = createFrameStateValidator(features(), () => {
			called = true;
			return true;
		});
		expect(isValid({ ...validFrame, width: -1 })).toBe(false);
		expect(called).toBe(false);
	});
});
