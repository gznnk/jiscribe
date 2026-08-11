import { describe, it, expect } from "vitest";

import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { resolveOpenReference } from "../resolveOpenReference";

const rect = (id: string, meta?: Record<string, unknown>): ObjectState =>
	({
		id,
		type: "rect",
		...(meta ? { meta } : {}),
	}) as unknown as ObjectState;

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

describe("resolveOpenReference", () => {
	it("returns the payload for a single selection carrying a reference", () => {
		const r = rect("r1", { reference: "./spec.md" });
		expect(resolveOpenReference(makeState(["r1"], { r1: r }))).toEqual({
			objectId: "r1",
			reference: "./spec.md",
		});
	});

	it("returns null when nothing is selected", () => {
		expect(resolveOpenReference(makeState([], {}))).toBeNull();
	});

	it("returns null for a multiple selection, even when every object has one", () => {
		const r1 = rect("r1", { reference: "./a.md" });
		const r2 = rect("r2", { reference: "./b.md" });
		expect(resolveOpenReference(makeState(["r1", "r2"], { r1, r2 }))).toBeNull();
	});

	it("returns null when only a connector is selected", () => {
		const c = rect("c1", { reference: "./a.md" });
		expect(resolveOpenReference(makeState([], { c1: c }, "c1"))).toBeNull();
	});

	it("returns null when the object has no meta", () => {
		expect(
			resolveOpenReference(makeState(["r1"], { r1: rect("r1") })),
		).toBeNull();
	});

	it("returns null when meta holds no reference", () => {
		const r = rect("r1", { name: "Box" });
		expect(resolveOpenReference(makeState(["r1"], { r1: r }))).toBeNull();
	});

	it("returns null for an empty reference", () => {
		const r = rect("r1", { reference: "" });
		expect(resolveOpenReference(makeState(["r1"], { r1: r }))).toBeNull();
	});

	it("returns null for a reference that is not a string", () => {
		const r = rect("r1", { reference: 42 });
		expect(resolveOpenReference(makeState(["r1"], { r1: r }))).toBeNull();
	});

	it("returns null when the selected id has no object", () => {
		expect(resolveOpenReference(makeState(["missing"], {}))).toBeNull();
	});
});
