import { describe, expect, it } from "vitest";

import {
	isValidConnectorLabelState,
	isValidConnectorState,
} from "../validateConnectorState";

// Colours are the "auto" sentinel: a real colour would reach isCssColor
// (CSS.supports), which the node test environment has no CSS for. Real colours
// are covered by the paste e2e.
const ownedRef = {
	owner: { id: "r1" },
	anchor: { kind: "center" },
};
const freeRef = { anchor: { kind: "free", point: { x: 0, y: 0 } } };

const validConnector = {
	id: "c1",
	type: "connector",
	points: [],
	stroke: "auto",
	source: ownedRef,
	target: freeRef,
};

describe("isValidConnectorState", () => {
	it("owned + free / owned + owned is true", () => {
		expect(isValidConnectorState(validConnector)).toBe(true);
		expect(isValidConnectorState({ ...validConnector, target: ownedRef })).toBe(
			true,
		);
	});

	it("intermediate waypoints (points) are true whether empty array or populated", () => {
		expect(isValidConnectorState({ ...validConnector, points: [] })).toBe(true);
		expect(
			isValidConnectorState({ ...validConnector, points: [{ x: 5, y: 5 }] }),
		).toBe(true);
	});

	it("both ends free is false (at least one must be owned)", () => {
		expect(
			isValidConnectorState({
				...validConnector,
				source: freeRef,
				target: freeRef,
			}),
		).toBe(false);
	});

	it("missing source / target is false", () => {
		expect(
			isValidConnectorState({ ...validConnector, source: undefined }),
		).toBe(false);
		expect(
			isValidConnectorState({ ...validConnector, target: undefined }),
		).toBe(false);
	});

	it("endpoint whose owner.id is not a string is false", () => {
		const badRef = {
			owner: { id: 123 },
			anchor: { kind: "center" },
		};
		expect(isValidConnectorState({ ...validConnector, source: badRef })).toBe(
			false,
		);
	});

	it("invalid ArrowType is false", () => {
		expect(
			isValidConnectorState({ ...validConnector, endArrow: "diamond" }),
		).toBe(false);
	});

	it("routing allows omitted, straight, and orthogonal", () => {
		expect(isValidConnectorState(validConnector)).toBe(true);
		expect(
			isValidConnectorState({ ...validConnector, routing: "straight" }),
		).toBe(true);
		expect(
			isValidConnectorState({ ...validConnector, routing: "orthogonal" }),
		).toBe(true);
	});

	it("unknown routing value is false", () => {
		expect(
			isValidConnectorState({ ...validConnector, routing: "diagonal" }),
		).toBe(false);
	});

	it("connector with malformed label structure is false (verifies label validation is wired in)", () => {
		expect(
			isValidConnectorState({ ...validConnector, label: { text: 123 } }),
		).toBe(false);
		expect(
			isValidConnectorState({
				...validConnector,
				label: { text: "Yes", position: 0.5 },
			}),
		).toBe(true);
	});
});

describe("isValidConnectorLabelState", () => {
	it("unspecified (undefined) is treated as no label and is true", () => {
		expect(isValidConnectorLabelState(undefined)).toBe(true);
	});

	it("minimal label with only text is true", () => {
		expect(isValidConnectorLabelState({ text: "Yes" })).toBe(true);
	});

	it("is true when position and style have correct types", () => {
		expect(
			isValidConnectorLabelState({
				text: "Success",
				position: 0.25,
				offset: -8,
				fontColor: "auto",
				fontFamily: '"Source Serif 4", "Noto Serif JP", serif',
				fontSize: 14,
				fontWeight: "bold",
			}),
		).toBe(true);
	});

	it("is true when background (fill) and border (stroke/strokeWidth/strokeDashType) have correct types", () => {
		expect(
			isValidConnectorLabelState({
				text: "Yes",
				fill: "auto",
				stroke: "auto",
				strokeWidth: 2,
				strokeDashType: "dashed",
			}),
		).toBe(true);
	});

	it("is false when fill / stroke / strokeWidth / strokeDashType have wrong types", () => {
		expect(isValidConnectorLabelState({ text: "x", fill: 0 })).toBe(false);
		expect(isValidConnectorLabelState({ text: "x", stroke: 1 })).toBe(false);
		expect(isValidConnectorLabelState({ text: "x", strokeWidth: "2" })).toBe(
			false,
		);
		expect(
			isValidConnectorLabelState({ text: "x", strokeDashType: "double" }),
		).toBe(false);
	});

	it("non-object (string, null) is false", () => {
		expect(isValidConnectorLabelState("Yes")).toBe(false);
		expect(isValidConnectorLabelState(null)).toBe(false);
	});

	it("is false when text is missing or not a string", () => {
		expect(isValidConnectorLabelState({})).toBe(false);
		expect(isValidConnectorLabelState({ text: 123 })).toBe(false);
	});

	it("fields with wrong types when present are false", () => {
		expect(isValidConnectorLabelState({ text: "x", position: "0.5" })).toBe(
			false,
		);
		expect(isValidConnectorLabelState({ text: "x", offset: "0" })).toBe(false);
		expect(isValidConnectorLabelState({ text: "x", fontSize: "14" })).toBe(
			false,
		);
		expect(isValidConnectorLabelState({ text: "x", fontColor: 0 })).toBe(false);
		expect(isValidConnectorLabelState({ text: "x", fontWeight: 700 })).toBe(
			false,
		);
	});

	// Parity with the Doc-side validator: anything accepted at this clipboard boundary
	// must also survive re-parse, so the same range / CSS-safety invariants apply.
	it("position out of the 0..1 range is false", () => {
		expect(isValidConnectorLabelState({ text: "x", position: 0 })).toBe(true);
		expect(isValidConnectorLabelState({ text: "x", position: 1 })).toBe(true);
		expect(isValidConnectorLabelState({ text: "x", position: 5 })).toBe(false);
		expect(isValidConnectorLabelState({ text: "x", position: -0.1 })).toBe(
			false,
		);
	});

	it("CSS-injection strings in the style fields are false", () => {
		const injection = "red;} body { display: none }";
		expect(isValidConnectorLabelState({ text: "x", stroke: injection })).toBe(
			false,
		);
		expect(isValidConnectorLabelState({ text: "x", fill: injection })).toBe(
			false,
		);
		expect(
			isValidConnectorLabelState({ text: "x", fontColor: injection }),
		).toBe(false);
		expect(
			isValidConnectorLabelState({ text: "x", fontWeight: injection }),
		).toBe(false);
		expect(
			isValidConnectorLabelState({ text: "x", fontFamily: injection }),
		).toBe(false);
	});

	it("fontSize below 1 / negative strokeWidth is false", () => {
		expect(isValidConnectorLabelState({ text: "x", fontSize: 0 })).toBe(false);
		expect(isValidConnectorLabelState({ text: "x", strokeWidth: -1 })).toBe(
			false,
		);
	});
});
