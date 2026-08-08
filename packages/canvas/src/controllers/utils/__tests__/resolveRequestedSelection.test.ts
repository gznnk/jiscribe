import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { resolveRequestedSelection } from "../resolveRequestedSelection";

const rect = (id: string): ObjectState =>
	({
		id,
		type: "rect",
		cx: 0,
		cy: 0,
		width: 10,
		height: 10,
	}) as unknown as ObjectState;

// source / target are what isConnectorState checks for besides the type
const connector = (id: string): ObjectState =>
	({
		id,
		type: "connector",
		source: { objectId: "rect-1" },
		target: { objectId: "rect-2" },
		points: [
			{ x: 0, y: 0 },
			{ x: 10, y: 10 },
		],
	}) as unknown as ObjectState;

const objects: Record<string, ObjectState> = {
	"rect-1": rect("rect-1"),
	"rect-2": rect("rect-2"),
	"conn-1": connector("conn-1"),
	"conn-2": connector("conn-2"),
};

describe("resolveRequestedSelection", () => {
	it("keeps the requested order and collapses duplicates", () => {
		expect(
			resolveRequestedSelection(["rect-2", "rect-1", "rect-2"], objects),
		).toEqual({
			selectedIds: ["rect-2", "rect-1"],
			selectedConnectorId: null,
			ignoredIds: [],
		});
	});

	it("clears the selection for an empty list", () => {
		expect(resolveRequestedSelection([], objects)).toEqual({
			selectedIds: [],
			selectedConnectorId: null,
			ignoredIds: [],
		});
	});

	it("drops ids that are not on the canvas", () => {
		expect(resolveRequestedSelection(["rect-1", "nope"], objects)).toEqual({
			selectedIds: ["rect-1"],
			selectedConnectorId: null,
			ignoredIds: ["nope"],
		});
	});

	it("puts a lone connector on the connector channel", () => {
		expect(resolveRequestedSelection(["conn-1"], objects)).toEqual({
			selectedIds: [],
			selectedConnectorId: "conn-1",
			ignoredIds: [],
		});
	});

	it("drops a connector asked for together with a shape", () => {
		// The state holds shapes and the connector in mutually exclusive channels,
		// so the pair cannot be selected at once.
		expect(resolveRequestedSelection(["rect-1", "conn-1"], objects)).toEqual({
			selectedIds: ["rect-1"],
			selectedConnectorId: null,
			ignoredIds: ["conn-1"],
		});
	});

	it("drops every connector when several are asked for", () => {
		expect(resolveRequestedSelection(["conn-1", "conn-2"], objects)).toEqual({
			selectedIds: [],
			selectedConnectorId: null,
			ignoredIds: ["conn-1", "conn-2"],
		});
	});
});
