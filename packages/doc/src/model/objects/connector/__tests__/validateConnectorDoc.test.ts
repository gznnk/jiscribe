import { describe, it, expect } from "vitest";

import { validateConnectorDoc } from "../validateConnectorDoc";

const validPoints = [
	{ x: 0, y: 0 },
	{ x: 100, y: 100 },
];
const ownedRef = {
	owner: { id: "rect-1" },
	anchor: { kind: "center" },
};
const freeRef = { anchor: { kind: "free", point: { x: 0, y: 0 } } };

describe("validateConnectorDoc", () => {
	it("yields no error for a valid Connector with only owned endpoints", () => {
		const o = { points: validPoints, source: ownedRef, target: ownedRef };
		expect(validateConnectorDoc(o, "root")).toEqual([]);
	});

	it("yields no error for a valid one-free Connector (owned source + free target)", () => {
		const o = { points: validPoints, source: ownedRef, target: freeRef };
		expect(validateConnectorDoc(o, "root")).toEqual([]);
	});

	it("is an error when both endpoints are free (no owner) (at least one must be owned)", () => {
		const o = { points: validPoints, source: freeRef, target: freeRef };
		const errors = validateConnectorDoc(o, "root");
		const bothFree = errors.find(
			(e) => e.path === "root" && e.message.includes("owned endpoint"),
		);
		expect(bothFree).toBeDefined();
		// This rule is also caught by the JSON schema (ConnectorDoc's not constraint),
		// so beyondSchema is not attached (the extension defers structural errors to the schema).
		expect(bothFree?.beyondSchema).toBeUndefined();
	});

	it("is an error when source is missing entirely (even with an owned target)", () => {
		const o = { points: validPoints, target: ownedRef };
		const errors = validateConnectorDoc(o, "root");
		expect(
			errors.some(
				(e) => e.path === "root.source" && e.message === "must be an object",
			),
		).toBe(true);
	});

	it("is an error when target is missing entirely (even with an owned source)", () => {
		const o = { points: validPoints, source: ownedRef };
		const errors = validateConnectorDoc(o, "root");
		expect(
			errors.some(
				(e) => e.path === "root.target" && e.message === "must be an object",
			),
		).toBe(true);
	});

	it("is an error when source is not an object", () => {
		const o = { points: validPoints, source: 5, target: ownedRef };
		const errors = validateConnectorDoc(o, "root");
		expect(
			errors.some(
				(e) => e.path === "root.source" && e.message === "must be an object",
			),
		).toBe(true);
	});

	it("yields no error when startArrow / endArrow have valid values", () => {
		const o = {
			points: validPoints,
			source: ownedRef,
			target: freeRef,
			startArrow: "None",
			endArrow: "OpenArrow",
		};
		expect(validateConnectorDoc(o, "root")).toEqual([]);
	});

	it("yields no error when points is an empty array (straight connector)", () => {
		const o = { points: [], source: ownedRef, target: freeRef };
		expect(validateConnectorDoc(o, "root")).toEqual([]);
	});

	it("yields no error when points is omitted (optional, defaults to [])", () => {
		const o = { source: ownedRef, target: freeRef };
		expect(validateConnectorDoc(o, "root")).toEqual([]);
	});

	it("is an error when points is invalid", () => {
		const o = { points: [{ x: 0 }], source: freeRef, target: freeRef };
		expect(
			validateConnectorDoc(o, "root").some((e) => e.path === "root.points"),
		).toBe(true);
	});

	it("is an error when source's owner.id is a number", () => {
		const badRef = {
			owner: { id: 123 },
			anchor: { kind: "center" },
		};
		const errors = validateConnectorDoc(
			{ points: validPoints, source: badRef, target: freeRef },
			"root",
		);
		expect(errors.some((e) => e.path === "root.source.owner.id")).toBe(true);
	});

	it("yields no error for source's connectPoint anchor (valid id)", () => {
		const ref = {
			owner: { id: "rect-1" },
			anchor: { kind: "connectPoint", id: "leftCenter" },
		};
		const o = { points: validPoints, source: ref, target: freeRef };
		expect(validateConnectorDoc(o, "root")).toEqual([]);
	});

	it("is an error when source's connectPoint anchor has an invalid id", () => {
		const badRef = {
			owner: { id: "rect-1" },
			// "center" is the one id a connectPoint can never carry: the center is
			// its own anchor kind. Any other name is left to the shape's type.
			anchor: { kind: "connectPoint", id: "center" },
		};
		const errors = validateConnectorDoc(
			{ points: validPoints, source: badRef, target: freeRef },
			"root",
		);
		expect(errors.some((e) => e.path === "root.source.anchor.id")).toBe(true);
	});

	it("is an error when source's anchor.kind is free (invalid for owned)", () => {
		const badRef = {
			owner: { id: "rect-1" },
			anchor: { kind: "free", point: { x: 0, y: 0 } },
		};
		const errors = validateConnectorDoc(
			{ points: validPoints, source: badRef, target: freeRef },
			"root",
		);
		expect(errors.some((e) => e.path === "root.source.anchor.kind")).toBe(true);
	});

	it("is an error when target's free anchor has a non-numeric point.x", () => {
		const badRef = { anchor: { kind: "free", point: { x: "0", y: 0 } } };
		const errors = validateConnectorDoc(
			{ points: validPoints, source: freeRef, target: badRef },
			"root",
		);
		expect(errors.some((e) => e.path === "root.target.anchor.point.x")).toBe(
			true,
		);
	});

	it("is an error when startArrow has an invalid value", () => {
		const o = {
			points: validPoints,
			source: freeRef,
			target: freeRef,
			startArrow: "arrow",
		};
		const errors = validateConnectorDoc(o, "root");
		expect(errors.some((e) => e.path === "root.startArrow")).toBe(true);
	});

	it("is an error when strokeDashType has an invalid value", () => {
		const o = {
			points: validPoints,
			source: freeRef,
			target: freeRef,
			strokeDashType: "double",
		};
		const errors = validateConnectorDoc(o, "root");
		expect(errors.some((e) => e.path === "root.strokeDashType")).toBe(true);
	});

	// ─── Additional coverage ───
	it("is an error when endArrow has an invalid value", () => {
		const o = {
			points: validPoints,
			source: ownedRef,
			target: freeRef,
			endArrow: "diamond",
		};
		const errors = validateConnectorDoc(o, "root");
		expect(errors.some((e) => e.path === "root.endArrow")).toBe(true);
	});

	it("is an error (beyondSchema) when stroke contains a CSS breakout string", () => {
		const o = {
			points: validPoints,
			source: ownedRef,
			target: freeRef,
			stroke: "a;b",
		};
		const hit = validateConnectorDoc(o, "root").find(
			(e) => e.path === "root.stroke",
		);
		expect(hit).toBeDefined();
		expect(hit?.beyondSchema).toBe(true);
	});

	it("is an error when waypoint points is not an array (invalid Point[])", () => {
		const o = { points: "x", source: ownedRef, target: freeRef };
		expect(
			validateConnectorDoc(o, "root").some((e) => e.path === "root.points"),
		).toBe(true);
	});

	it("is an error when an owned endpoint's anchor is missing (not an object)", () => {
		const badRef = { owner: { id: "rect-1" } };
		const errors = validateConnectorDoc(
			{ points: validPoints, source: badRef, target: freeRef },
			"root",
		);
		expect(errors.some((e) => e.path === "root.source.anchor")).toBe(true);
	});

	it("is an error when a free endpoint's point.y is not a number", () => {
		const badRef = { anchor: { kind: "free", point: { x: 0, y: "0" } } };
		const errors = validateConnectorDoc(
			{ points: validPoints, source: ownedRef, target: badRef },
			"root",
		);
		expect(errors.some((e) => e.path === "root.target.anchor.point.y")).toBe(
			true,
		);
	});

	it("yields no error when routing is straight / orthogonal", () => {
		const straight = {
			points: validPoints,
			source: ownedRef,
			target: freeRef,
			routing: "straight",
		};
		const orthogonal = { ...straight, routing: "orthogonal" };
		expect(validateConnectorDoc(straight, "root")).toEqual([]);
		expect(validateConnectorDoc(orthogonal, "root")).toEqual([]);
	});

	it("is an error when routing has an unknown value", () => {
		const o = {
			points: validPoints,
			source: ownedRef,
			target: freeRef,
			routing: "diagonal",
		};
		const errors = validateConnectorDoc(o, "root");
		expect(errors.some((e) => e.path === "root.routing")).toBe(true);
	});

	// ─── label (connector label) ───
	it("yields no error for a valid label with only label.text", () => {
		const o = {
			points: validPoints,
			source: ownedRef,
			target: freeRef,
			label: { text: "Yes" },
		};
		expect(validateConnectorDoc(o, "root")).toEqual([]);
	});

	it("yields no error when the label specifies position/offset/font", () => {
		const o = {
			points: validPoints,
			source: ownedRef,
			target: freeRef,
			label: {
				text: "Success",
				position: 0.25,
				offset: 8,
				fontColor: "#2E7D32",
				fontFamily: '"Source Serif 4", "Noto Serif JP", serif',
				fontSize: 14,
				fontWeight: "bold",
			},
		};
		expect(validateConnectorDoc(o, "root")).toEqual([]);
	});

	it("is an error for top-level text (should use label.text)", () => {
		const o = {
			points: validPoints,
			source: ownedRef,
			target: freeRef,
			text: "Yes",
		};
		const errors = validateConnectorDoc(o, "root");
		expect(errors.some((e) => e.path === "root.text")).toBe(true);
	});

	it("is an error when label.text is not a string", () => {
		const o = {
			points: validPoints,
			source: ownedRef,
			target: freeRef,
			label: { text: 123 },
		};
		const errors = validateConnectorDoc(o, "root");
		expect(errors.some((e) => e.path === "root.label.text")).toBe(true);
	});

	it("is an error when label.position is out of range (>1)", () => {
		const o = {
			points: validPoints,
			source: ownedRef,
			target: freeRef,
			label: { text: "x", position: 1.5 },
		};
		const errors = validateConnectorDoc(o, "root");
		expect(errors.some((e) => e.path === "root.label.position")).toBe(true);
	});

	it("is an error when label.fontSize is below the lower bound (<1)", () => {
		const o = {
			points: validPoints,
			source: ownedRef,
			target: freeRef,
			label: { text: "x", fontSize: 0 },
		};
		const errors = validateConnectorDoc(o, "root");
		expect(errors.some((e) => e.path === "root.label.fontSize")).toBe(true);
	});

	it("is an error (beyondSchema) when label.fontFamily contains a CSS breakout string", () => {
		const o = {
			points: validPoints,
			source: ownedRef,
			target: freeRef,
			label: { text: "x", fontFamily: "serif; } html {" },
		};
		const hit = validateConnectorDoc(o, "root").find(
			(e) => e.path === "root.label.fontFamily",
		);
		expect(hit).toBeDefined();
		expect(hit?.beyondSchema).toBe(true);
	});

	it("is an error when label is not an object", () => {
		const o = {
			points: validPoints,
			source: ownedRef,
			target: freeRef,
			label: "Yes",
		};
		const errors = validateConnectorDoc(o, "root");
		expect(errors.some((e) => e.path === "root.label")).toBe(true);
	});

	it("yields no error when the label specifies a background (fill) and border (stroke/strokeWidth)", () => {
		const o = {
			points: validPoints,
			source: ownedRef,
			target: freeRef,
			label: { text: "Yes", fill: "#fff", stroke: "auto", strokeWidth: 2 },
		};
		expect(validateConnectorDoc(o, "root")).toEqual([]);
	});

	it("is an error (beyondSchema) when label.fill contains a CSS breakout string", () => {
		const o = {
			points: validPoints,
			source: ownedRef,
			target: freeRef,
			label: { text: "x", fill: "a;b" },
		};
		const hit = validateConnectorDoc(o, "root").find(
			(e) => e.path === "root.label.fill",
		);
		expect(hit).toBeDefined();
		expect(hit?.beyondSchema).toBe(true);
	});

	it("is an error when label.strokeWidth is negative", () => {
		const o = {
			points: validPoints,
			source: ownedRef,
			target: freeRef,
			label: { text: "x", strokeWidth: -1 },
		};
		const errors = validateConnectorDoc(o, "root");
		expect(errors.some((e) => e.path === "root.label.strokeWidth")).toBe(true);
	});

	it("yields no error when label.strokeDashType is dashed/dotted/solid", () => {
		for (const dash of ["solid", "dashed", "dotted"]) {
			const o = {
				points: validPoints,
				source: ownedRef,
				target: freeRef,
				label: { text: "x", strokeDashType: dash },
			};
			expect(validateConnectorDoc(o, "root")).toEqual([]);
		}
	});

	it("is an error when label.strokeDashType has an unknown value", () => {
		const o = {
			points: validPoints,
			source: ownedRef,
			target: freeRef,
			label: { text: "x", strokeDashType: "double" },
		};
		const errors = validateConnectorDoc(o, "root");
		expect(errors.some((e) => e.path === "root.label.strokeDashType")).toBe(
			true,
		);
	});
});
