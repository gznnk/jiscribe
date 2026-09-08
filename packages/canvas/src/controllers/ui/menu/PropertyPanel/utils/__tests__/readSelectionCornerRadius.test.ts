import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import { readSelectionCornerRadius } from "../readSelectionCornerRadius";

const rect = (id: string, extra?: Record<string, unknown>): ObjectState =>
	({
		id,
		type: "rect",
		features: { type: "rect", geometry: "rect", fill: true, radius: true },
		...extra,
	}) as unknown as ObjectState;

/** A shape with no corners to round, so it has no say. */
const ellipse = (id: string): ObjectState =>
	({
		id,
		type: "ellipse",
		features: { type: "ellipse", geometry: "ellipse", fill: true },
	}) as unknown as ObjectState;

const group = (id: string, childIds: string[]): GroupState =>
	({ id, type: "group", childIds }) as unknown as GroupState;

describe("readSelectionCornerRadius", () => {
	it("nothing selected → none", () => {
		expect(readSelectionCornerRadius([], {})).toEqual({ kind: "none" });
	});

	it("nothing selected has corners to round → none", () => {
		const objects = { e: ellipse("e") };
		expect(readSelectionCornerRadius(["e"], objects)).toEqual({ kind: "none" });
	});

	it("one shape → its own radius", () => {
		expect(
			readSelectionCornerRadius(["a"], { a: rect("a", { rx: 8 }) }),
		).toEqual({ kind: "single", value: 8 });
	});

	it("two shapes rounded the same → one value", () => {
		const objects = { a: rect("a", { rx: 8 }), b: rect("b", { rx: 8 }) };
		expect(readSelectionCornerRadius(["a", "b"], objects)).toEqual({
			kind: "single",
			value: 8,
		});
	});

	it("a shape that wrote no radius reads as square, so it disagrees with a rounded one", () => {
		const objects = { a: rect("a", { rx: 8 }), b: rect("b") };
		expect(readSelectionCornerRadius(["a", "b"], objects)).toEqual({
			kind: "mixed",
		});
	});

	it("shapes that all wrote no radius agree on being square", () => {
		const objects = { a: rect("a"), b: rect("b") };
		expect(readSelectionCornerRadius(["a", "b"], objects)).toEqual({
			kind: "single",
			value: 0,
		});
	});

	it("descendants of a selected group have their say", () => {
		const objects = {
			g: group("g", ["a", "b"]),
			a: rect("a", { rx: 8 }),
			b: rect("b", { rx: 2 }),
		};
		expect(readSelectionCornerRadius(["g"], objects)).toEqual({
			kind: "mixed",
		});
	});
});
