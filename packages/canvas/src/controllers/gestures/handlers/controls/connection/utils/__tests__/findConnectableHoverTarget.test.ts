import { describe, expect, it } from "vitest";

import { ConnectorFeatures } from "../../../../../../../schemas/objects/connections/connector/ConnectorDoc";
import { RectFeatures } from "../../../../../../../schemas/objects/primitives/rect/RectDoc";
import type { ObjectState } from "../../../../../../../states/objects/base/ObjectState";
import { findConnectableHoverTarget } from "../findConnectableHoverTarget";

// The stamped features descriptor decides connectability
// (RectFeatures.connectable = true, ConnectorFeatures.connectable = false).
const rectObj = (id: string): ObjectState => ({
	id,
	type: "rect",
	features: RectFeatures,
});

const connectorObj = (id: string): ObjectState => ({
	id,
	type: "connector",
	features: ConnectorFeatures,
});

const objects: Record<string, ObjectState> = {
	"rect-1": rectObj("rect-1"),
	"rect-2": rectObj("rect-2"),
	"connector-1": connectorObj("connector-1"),
};

describe("findConnectableHoverTarget", () => {
	it("returns the first connectable hover target", () => {
		const result = findConnectableHoverTarget({
			hovered: [{ id: "rect-1", kind: "object" }],
			objects,
		});
		expect(result).toEqual({ id: "rect-1", object: objects["rect-1"] });
	});

	it("includes the same object as the fixed side (self-loop allowed)", () => {
		const result = findConnectableHoverTarget({
			hovered: [{ id: "rect-1", kind: "object" }],
			objects,
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
		});
		expect(result).toEqual({ id: "rect-1", object: objects["rect-1"] });
	});

	it("returns null when there is no match", () => {
		const result = findConnectableHoverTarget({
			hovered: [{ id: "connector-1", kind: "object" }],
			objects,
		});
		expect(result).toBeNull();
	});

	it("synthetic states without features are not connectable", () => {
		const result = findConnectableHoverTarget({
			hovered: [{ id: "no-features", kind: "object" }],
			objects: { "no-features": { id: "no-features", type: "rect" } },
		});
		expect(result).toBeNull();
	});
});
