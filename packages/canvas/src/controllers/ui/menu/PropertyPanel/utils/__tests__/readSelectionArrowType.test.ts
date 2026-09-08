import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { GroupState } from "../../../../../../states/objects/primitives/group/GroupState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { readSelectionArrowType } from "../readSelectionArrowType";

const connector = (id: string, extra?: Record<string, unknown>): ObjectState =>
	({
		id,
		type: "connector",
		features: {
			type: "connector",
			geometry: "poly",
			stroke: true,
			arrow: true,
		},
		...extra,
	}) as unknown as ObjectState;

/** A shape with no ends to mark, so it has no say. */
const rect = (id: string): ObjectState =>
	({
		id,
		type: "rect",
		features: { type: "rect", geometry: "rect", fill: true },
	}) as unknown as ObjectState;

const group = (id: string, childIds: string[]): GroupState =>
	({ id, type: "group", childIds }) as unknown as GroupState;

const makeState = (
	selectedIds: string[],
	objects: Record<string, ObjectState>,
	selectedConnectorId: string | null = null,
): CanvasControllerState =>
	({
		selectedIds,
		objects,
		selectedConnectorId,
	}) as unknown as CanvasControllerState;

describe("readSelectionArrowType", () => {
	it("nothing selected → none", () => {
		expect(readSelectionArrowType(makeState([], {}), "endArrow")).toEqual({
			kind: "none",
		});
	});

	it("nothing selected has ends to mark → none", () => {
		const objects = { r: rect("r") };
		expect(
			readSelectionArrowType(makeState(["r"], objects), "endArrow"),
		).toEqual({ kind: "none" });
	});

	it("the selected connector answers for itself", () => {
		const objects = { c: connector("c", { endArrow: "Arrow" }) };
		expect(
			readSelectionArrowType(makeState([], objects, "c"), "endArrow"),
		).toEqual({ kind: "single", value: "Arrow" });
	});

	it("two lines marked the same way → one value", () => {
		const objects = {
			a: connector("a", { endArrow: "Arrow" }),
			b: connector("b", { endArrow: "Arrow" }),
		};
		expect(
			readSelectionArrowType(makeState(["a", "b"], objects), "endArrow"),
		).toEqual({ kind: "single", value: "Arrow" });
	});

	it("two lines marked differently → mixed", () => {
		const objects = {
			a: connector("a", { endArrow: "Arrow" }),
			b: connector("b", { endArrow: "Diamond" }),
		};
		expect(
			readSelectionArrowType(makeState(["a", "b"], objects), "endArrow"),
		).toEqual({ kind: "mixed" });
	});

	it("a line that wrote no end reads as bare, so it disagrees with a marked one", () => {
		const objects = {
			a: connector("a", { endArrow: "Arrow" }),
			b: connector("b"),
		};
		expect(
			readSelectionArrowType(makeState(["a", "b"], objects), "endArrow"),
		).toEqual({ kind: "mixed" });
	});

	it("lines that all wrote no end agree on being bare", () => {
		const objects = { a: connector("a"), b: connector("b") };
		expect(
			readSelectionArrowType(makeState(["a", "b"], objects), "startArrow"),
		).toEqual({ kind: "single", value: "None" });
	});

	it("the two ends are read apart", () => {
		const objects = {
			a: connector("a", { startArrow: "None", endArrow: "Arrow" }),
			b: connector("b", { startArrow: "None", endArrow: "Diamond" }),
		};
		expect(
			readSelectionArrowType(makeState(["a", "b"], objects), "startArrow"),
		).toEqual({ kind: "single", value: "None" });
		expect(
			readSelectionArrowType(makeState(["a", "b"], objects), "endArrow"),
		).toEqual({ kind: "mixed" });
	});

	it("descendants of a selected group have their say", () => {
		const objects = {
			g: group("g", ["a", "b"]),
			a: connector("a", { endArrow: "Arrow" }),
			b: connector("b", { endArrow: "Diamond" }),
		};
		expect(
			readSelectionArrowType(makeState(["g"], objects), "endArrow"),
		).toEqual({ kind: "mixed" });
	});
});
