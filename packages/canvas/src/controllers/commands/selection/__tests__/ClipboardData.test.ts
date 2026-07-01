import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { isValidConnectorState } from "../../../../states/objects/connections/connector/validateConnectorState";
import { isValidGroupState } from "../../../../states/objects/primitives/group/validateGroupState";
import { isValidRectState } from "../../../../states/objects/primitives/rect/validateRectState";
import { objectStateValidatorRegistry } from "../../../../states/registry/ObjectStateValidatorRegistry";
import { isClipboardData } from "../ClipboardData";

const rect = (id: string) => ({
	id,
	type: "rect",
	cx: 0,
	cy: 0,
	width: 10,
	height: 10,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
});

const group = (id: string, childIds: string[]) => ({
	id,
	type: "group",
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
	childIds,
});

/**
 * A connector with source as owner (owned endpoint) and target as free.
 * A connector requires at least one endpoint to be owned, so this is the minimal test form.
 */
const connector = (id: string, sourceOwnerId: string) => ({
	id,
	type: "connector",
	points: [],
	source: {
		owner: { id: sourceOwnerId, type: "rect" },
		anchor: { kind: "center" },
	},
	target: { anchor: { kind: "free", point: { x: 1, y: 1 } } },
});

const baseClipboard = (
	objects: Record<string, unknown>,
	rootIds: string[],
) => ({
	__type: "jiscribe-canvas-clipboard",
	version: 1,
	center: { x: 0, y: 0 },
	rootIds,
	objects,
});

describe("isClipboardData", () => {
	beforeEach(() => {
		objectStateValidatorRegistry.clear();
		objectStateValidatorRegistry.register("rect", isValidRectState);
		objectStateValidatorRegistry.register("group", isValidGroupState);
		objectStateValidatorRegistry.register("connector", isValidConnectorState);
	});
	afterEach(() => {
		objectStateValidatorRegistry.clear();
	});

	describe("basic structure", () => {
		it("valid clipboard data is true", () => {
			const data = baseClipboard({ r1: rect("r1") }, ["r1"]);
			expect(isClipboardData(data)).toBe(true);
		});

		it("is false when __type / version / center / rootIds are invalid", () => {
			const ok = baseClipboard({ r1: rect("r1") }, ["r1"]);
			expect(isClipboardData({ ...ok, __type: "other" })).toBe(false);
			expect(isClipboardData({ ...ok, version: 2 })).toBe(false);
			expect(isClipboardData({ ...ok, center: { x: 0 } })).toBe(false);
			expect(isClipboardData({ ...ok, rootIds: [1] })).toBe(false);
			expect(isClipboardData(null)).toBe(false);
		});

		it("is false when rootIds contains an id not present in objects", () => {
			const data = baseClipboard({ r1: rect("r1") }, ["r1", "missing"]);
			expect(isClipboardData(data)).toBe(false);
		});

		it("is false when the map key and the object id do not match", () => {
			// key "kX" but id "r1". Since references resolve by id, self-containment breaks.
			const data = baseClipboard({ kX: rect("r1") }, ["r1"]);
			expect(isClipboardData(data)).toBe(false);
		});
	});

	describe("delegation of per-type validation", () => {
		it("structurally invalid (missing width) is false", () => {
			const broken = { ...rect("r1"), width: undefined };
			expect(isClipboardData(baseClipboard({ r1: broken }, ["r1"]))).toBe(
				false,
			);
		});

		it("a stroke containing a CSS injection is false", () => {
			const malicious = {
				...rect("r1"),
				stroke: "red; } body { background: url(x)",
			};
			expect(isClipboardData(baseClipboard({ r1: malicious }, ["r1"]))).toBe(
				false,
			);
		});

		it("an unregistered type is false", () => {
			const unknown = { id: "x1", type: "evil", cx: 0, cy: 0 };
			expect(isClipboardData(baseClipboard({ x1: unknown }, ["x1"]))).toBe(
				false,
			);
		});

		it("is false even for a known type when the registry is uninitialized (empty)", () => {
			objectStateValidatorRegistry.clear();
			const data = baseClipboard({ r1: rect("r1") }, ["r1"]);
			expect(isClipboardData(data)).toBe(false);
		});
	});

	describe("referential integrity (self-containment / #40)", () => {
		it("groups/connectors whose childIds / endpoints are self-contained are true", () => {
			const objects = {
				r1: rect("r1"),
				g1: group("g1", ["r1"]),
				c1: connector("c1", "r1"),
			};
			const data = baseClipboard(objects, ["g1", "c1"]);
			expect(isClipboardData(data)).toBe(true);
		});

		it("is false when a group's childIds point to an id not in objects (reference hijacking)", () => {
			// "ghost" is not in objects. It could hijack an existing id on the paste-target canvas.
			const objects = { r1: rect("r1"), g1: group("g1", ["r1", "ghost"]) };
			const data = baseClipboard(objects, ["g1"]);
			expect(isClipboardData(data)).toBe(false);
		});

		it("is false when a connector's endpoint owner points to an id not in objects", () => {
			// owner "ghost" is not in objects. It could bind arbitrarily to an existing object.
			const objects = { c1: connector("c1", "ghost") };
			const data = baseClipboard(objects, ["c1"]);
			expect(isClipboardData(data)).toBe(false);
		});

		it("a connector with both ends free is false (at least one must be owned)", () => {
			const floating = {
				id: "c1",
				type: "connector",
				points: [],
				source: { anchor: { kind: "free", point: { x: 0, y: 0 } } },
				target: { anchor: { kind: "free", point: { x: 1, y: 1 } } },
			};
			const data = baseClipboard({ c1: floating }, ["c1"]);
			expect(isClipboardData(data)).toBe(false);
		});

		it("a group with empty childIds is false", () => {
			const data = baseClipboard({ g1: group("g1", []) }, ["g1"]);
			expect(isClipboardData(data)).toBe(false);
		});
	});

	describe("acyclicity (#46)", () => {
		it("a group with self-referencing childIds is false", () => {
			// childIds:["g1"] is self-contained (g1 is in objects) but cyclic.
			// An unguarded recursive consumer would infinitely recurse → stack overflow (DoS).
			const data = baseClipboard({ g1: group("g1", ["g1"]) }, ["g1"]);
			expect(isClipboardData(data)).toBe(false);
		});

		it("groups with mutually referencing childIds are false", () => {
			const objects = {
				g1: group("g1", ["g2"]),
				g2: group("g2", ["g1"]),
			};
			const data = baseClipboard(objects, ["g1"]);
			expect(isClipboardData(data)).toBe(false);
		});

		it("is false when there is a cycle even in deep nesting", () => {
			const objects = {
				g1: group("g1", ["g2"]),
				g2: group("g2", ["g3"]),
				g3: group("g3", ["g1"]),
			};
			const data = baseClipboard(objects, ["g1"]);
			expect(isClipboardData(data)).toBe(false);
		});

		it("non-cyclic nested groups (a DAG) are true", () => {
			// even if g1 and g2 share the same child r1, it passes as long as it's not cyclic.
			const objects = {
				r1: rect("r1"),
				g2: group("g2", ["r1"]),
				g1: group("g1", ["g2", "r1"]),
			};
			const data = baseClipboard(objects, ["g1"]);
			expect(isClipboardData(data)).toBe(true);
		});
	});
});
