import { ConnectorFeatures } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import { RectFeatures } from "@jiscribe/doc/model/objects/primitives/rect/RectDoc";
import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";
import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../../../../../states/objects/base/ObjectState";
import { findConnectableHoverTarget } from "../findConnectableHoverTarget";

// Connectability comes from the registered features of the type
// (RectFeatures.connectable = true, ConnectorFeatures.connectable = false).
const featuresByType = new Map<ObjectType, ObjectFeatures>([
	["rect", RectFeatures],
	["connector", ConnectorFeatures],
]);

const objectMapperRegistry = {
	getFeatures: (type: ObjectType) => featuresByType.get(type),
};

const objects: Record<string, ObjectState> = {
	"rect-1": { id: "rect-1", type: "rect" },
	"rect-2": { id: "rect-2", type: "rect" },
	"connector-1": { id: "connector-1", type: "connector" },
};

describe("findConnectableHoverTarget", () => {
	it("returns the first connectable hover target", () => {
		const result = findConnectableHoverTarget({
			hovered: [{ id: "rect-1", kind: "object" }],
			objects,
			objectMapperRegistry,
		});
		expect(result).toEqual({ id: "rect-1", object: objects["rect-1"] });
	});

	it("includes the same object as the fixed side (self-loop allowed)", () => {
		const result = findConnectableHoverTarget({
			hovered: [{ id: "rect-1", kind: "object" }],
			objects,
			objectMapperRegistry,
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
			objectMapperRegistry,
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
			objectMapperRegistry,
		});
		expect(result).toEqual({ id: "rect-1", object: objects["rect-1"] });
	});

	it("returns null when there is no match", () => {
		const result = findConnectableHoverTarget({
			hovered: [{ id: "connector-1", kind: "object" }],
			objects,
			objectMapperRegistry,
		});
		expect(result).toBeNull();
	});

	it("treats a type the registry does not know as not connectable", () => {
		const result = findConnectableHoverTarget({
			hovered: [{ id: "unknown-1", kind: "object" }],
			objects: {
				"unknown-1": { id: "unknown-1", type: "unregistered" as ObjectType },
			},
			objectMapperRegistry,
		});
		expect(result).toBeNull();
	});
});
