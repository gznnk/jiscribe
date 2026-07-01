import { describe, expect, it } from "vitest";

import type { ObjectType } from "../../../../../../../schemas/objects/types/ObjectType";
import type { ObjectState } from "../../../../../../../states/objects/base/ObjectState";
import { findConnectableHoverTarget } from "../findConnectableHoverTarget";

const obj = (id: string, type: ObjectType): ObjectState => ({ id, type });

const objects: Record<string, ObjectState> = {
	"rect-1": obj("rect-1", "rect"),
	"rect-2": obj("rect-2", "rect"),
	"connector-1": obj("connector-1", "connector"),
};

/** A simple predicate treating anything but connectors as connectable. */
const isConnectable = (type: ObjectType): boolean => type !== "connector";

describe("findConnectableHoverTarget", () => {
	it("returns the first connectable hover target", () => {
		const result = findConnectableHoverTarget({
			hovered: [{ id: "rect-1", kind: "object" }],
			objects,
			isConnectable,
		});
		expect(result).toEqual({ id: "rect-1", object: objects["rect-1"] });
	});

	it("includes the same object as the fixed side (self-loop allowed)", () => {
		const result = findConnectableHoverTarget({
			hovered: [{ id: "rect-1", kind: "object" }],
			objects,
			isConnectable,
		});
		expect(result).toEqual({ id: "rect-1", object: objects["rect-1"] });
	});

	it("skips non-connectable objects", () => {
		const result = findConnectableHoverTarget({
			hovered: [
				{ id: "connector-1", kind: "object" },
				{ id: "rect-2", kind: "object" },
			],
			objects,
			isConnectable,
		});
		expect(result).toEqual({ id: "rect-2", object: objects["rect-2"] });
	});

	it("ignores hover ids not present in objects", () => {
		const result = findConnectableHoverTarget({
			hovered: [
				{ id: "ghost", kind: "object" },
				{ id: "rect-1", kind: "object" },
			],
			objects,
			isConnectable,
		});
		expect(result).toEqual({ id: "rect-1", object: objects["rect-1"] });
	});

	it("returns null when there is no match", () => {
		const result = findConnectableHoverTarget({
			hovered: [{ id: "connector-1", kind: "object" }],
			objects,
			isConnectable,
		});
		expect(result).toBeNull();
	});
});
