import type { EndpointRef } from "@jiscribe/doc/model/objects/types/EndpointRef";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../states/objects/connector/ConnectorState";
import { remapConnectorEnds } from "../remapConnectorEnds";

const connectPointEnd = (ownerId: string, anchorId: string): EndpointRef => ({
	owner: { id: ownerId },
	anchor: { kind: "connectPoint", id: anchorId },
});

const connector = (
	id: string,
	source: EndpointRef,
	target: EndpointRef,
): ConnectorState =>
	({ id, type: "connector", source, target }) as unknown as ConnectorState;

const entity = { id: "entity", type: "erEntity" } as unknown as ObjectState;
const other = { id: "other", type: "rect" } as unknown as ObjectState;

describe("remapConnectorEnds", () => {
	it("re-anchors an end naming a remapped connect point of the owner", () => {
		const objects = {
			entity,
			other,
			line: connector(
				"line",
				connectPointEnd("entity", "col-2"),
				connectPointEnd("other", "rightCenter"),
			),
		};

		const remapped = remapConnectorEnds(objects, "entity", {
			"col-2": { kind: "connectPoint", id: "col-1" },
		});

		expect((remapped.line as ConnectorState).source).toEqual(
			connectPointEnd("entity", "col-1"),
		);
		expect((remapped.line as ConnectorState).target).toBe(objects.line.target);
		expect(remapped.entity).toBe(entity);
		expect(remapped.other).toBe(other);
	});

	it("exchanges the two ends of a swap rather than mapping one twice", () => {
		const objects = {
			entity,
			line: connector(
				"line",
				connectPointEnd("entity", "a"),
				connectPointEnd("entity", "b"),
			),
		};

		const remapped = remapConnectorEnds(objects, "entity", {
			a: { kind: "connectPoint", id: "b" },
			b: { kind: "connectPoint", id: "a" },
		});

		const line = remapped.line as ConnectorState;
		expect(line.source).toEqual(connectPointEnd("entity", "b"));
		expect(line.target).toEqual(connectPointEnd("entity", "a"));
	});

	it("can turn a removed connect point into another anchor kind", () => {
		const objects = {
			entity,
			line: connector(
				"line",
				connectPointEnd("entity", "col-3"),
				connectPointEnd("other", "leftCenter"),
			),
		};

		const remapped = remapConnectorEnds(objects, "entity", {
			"col-3": { kind: "center" },
		});

		expect((remapped.line as ConnectorState).source.anchor).toEqual({
			kind: "center",
		});
	});

	it("returns the map itself when no end moved", () => {
		const objects = {
			entity,
			other,
			// Same anchor id, another owner.
			onOther: connector(
				"onOther",
				connectPointEnd("other", "col-2"),
				connectPointEnd("other", "leftCenter"),
			),
			// The owner, but not on a connect point.
			onEdge: connector(
				"onEdge",
				{
					owner: { id: "entity" },
					anchor: { kind: "edge", side: "top", t: 0.5 },
				},
				{ anchor: { kind: "free", point: { x: 0, y: 0 } } },
			),
			// The owner's connect point, absent from the remap.
			unmapped: connector(
				"unmapped",
				connectPointEnd("entity", "col-9"),
				connectPointEnd("other", "leftCenter"),
			),
		};

		expect(
			remapConnectorEnds(objects, "entity", {
				"col-2": { kind: "connectPoint", id: "col-1" },
			}),
		).toBe(objects);
	});

	it("returns the map itself for an empty remap", () => {
		const objects = {
			entity,
			line: connector(
				"line",
				connectPointEnd("entity", "col-1"),
				connectPointEnd("other", "leftCenter"),
			),
		};

		expect(remapConnectorEnds(objects, "entity", {})).toBe(objects);
	});

	it("does not read an anchor id named like an Object.prototype member as remapped", () => {
		const objects = {
			entity,
			line: connector(
				"line",
				connectPointEnd("entity", "toString"),
				connectPointEnd("entity", "constructor"),
			),
		};

		expect(
			remapConnectorEnds(objects, "entity", {
				"col-1": { kind: "connectPoint", id: "col-2" },
			}),
		).toBe(objects);
	});

	it("leaves non-connector objects alone even when they carry source-like fields", () => {
		const lookalike = {
			id: "lookalike",
			type: "rect",
			source: connectPointEnd("entity", "col-1"),
			target: connectPointEnd("entity", "col-1"),
		} as unknown as ObjectState;
		const objects = { entity, lookalike };

		expect(
			remapConnectorEnds(objects, "entity", {
				"col-1": { kind: "connectPoint", id: "col-2" },
			}),
		).toBe(objects);
	});

	it("does not write into the map it was handed", () => {
		const line = connector(
			"line",
			connectPointEnd("entity", "col-2"),
			connectPointEnd("other", "leftCenter"),
		);
		const objects = Object.freeze({ entity, line });

		const remapped = remapConnectorEnds(objects, "entity", {
			"col-2": { kind: "connectPoint", id: "col-1" },
		});

		expect(remapped).not.toBe(objects);
		expect(objects.line).toBe(line);
		expect(line.source).toEqual(connectPointEnd("entity", "col-2"));
	});
});
