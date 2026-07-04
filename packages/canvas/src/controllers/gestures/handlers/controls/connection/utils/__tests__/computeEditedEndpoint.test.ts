import { describe, expect, it } from "vitest";

import type { EndpointRef } from "../../../../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../../../../states/objects/connections/connector/ConnectorState";
import { computeEditedEndpoint } from "../computeEditedEndpoint";

const free = (x: number, y: number): EndpointRef => ({
	anchor: { kind: "free", point: { x, y } },
});

const baseConnector = (): ConnectorState =>
	({
		id: "c1",
		type: "connector",
		points: [{ x: 5, y: 5 }],
		source: free(0, 0),
		target: free(10, 10),
	}) as unknown as ConnectorState;

/** A rect object with an unrotated, unscaled frame (center 100,100 / width 40 / height 20). */
const rectFrame = {
	id: "rect-1",
	type: "rect",
	cx: 100,
	cy: 100,
	width: 40,
	height: 20,
	rotation: 0,
	scaleX: 1,
	scaleY: 1,
} as unknown as ObjectState;

describe("computeEditedEndpoint", () => {
	it("makes target a free anchor at the cursor position when there is no hover target", () => {
		const result = computeEditedEndpoint(
			baseConnector(),
			"target",
			{ x: 80, y: 80 },
			null,
		);
		expect(result.target.anchor).toEqual({
			kind: "free",
			point: { x: 80, y: 80 },
		});
		// The fixed side (source) and waypoints are preserved
		expect(result.source).toEqual(free(0, 0));
		expect(result.points).toEqual([{ x: 5, y: 5 }]);
	});

	it("rounds free anchor coordinates by PRECISION.COORDINATE", () => {
		const result = computeEditedEndpoint(
			baseConnector(),
			"target",
			{ x: 12.123456, y: 9.987654 },
			null,
		);
		expect(result.target.anchor).toEqual({
			kind: "free",
			point: { x: 12.1235, y: 9.9877 },
		});
	});

	it("owner-connects to the nearest anchor when there is a hover target", () => {
		const result = computeEditedEndpoint(
			baseConnector(),
			"target",
			{ x: 100, y: 200 }, // outside the frame's bottom edge
			{ id: "rect-1", object: rectFrame },
		);
		expect(result.target).toEqual({
			owner: { id: "rect-1" },
			anchor: { kind: "connectPoint", id: "bottomCenter" },
		});
	});

	it("leaves target unchanged when source is the edit target", () => {
		const result = computeEditedEndpoint(
			baseConnector(),
			"source",
			{ x: 1, y: 2 },
			null,
		);
		expect(result.source.anchor).toEqual({
			kind: "free",
			point: { x: 1, y: 2 },
		});
		expect(result.target).toEqual(free(10, 10));
	});

	describe("self-loop (same object as the fixed side)", () => {
		// A connector whose fixed source is already connected to rect-1's bottomCenter.
		const selfLoopBase = (): ConnectorState =>
			({
				id: "c1",
				type: "connector",
				points: [],
				source: {
					owner: { id: "rect-1" },
					anchor: { kind: "connectPoint", id: "bottomCenter" },
				},
				target: free(10, 10),
			}) as unknown as ConnectorState;

		const fixedSource: EndpointRef = {
			owner: { id: "rect-1" },
			anchor: { kind: "connectPoint", id: "bottomCenter" },
		};

		it("does not select the fixed side's anchor when returning to the same object as the fixed side", () => {
			// Even with the cursor outside the bottom edge (where bottomCenter would normally be nearest),
			// bottomCenter is excluded because it is the fixed side, so a different edge midpoint is chosen.
			const result = computeEditedEndpoint(
				selfLoopBase(),
				"target",
				{ x: 100, y: 200 },
				{ id: "rect-1", object: rectFrame },
				fixedSource,
			);
			expect(result.target.owner).toEqual({ id: "rect-1" });
			const anchor = result.target.anchor;
			expect(anchor.kind).toBe("connectPoint");
			if (anchor.kind === "connectPoint") {
				expect(anchor.id).not.toBe("bottomCenter");
			}
		});

		it("does not select center in a self-loop (an edge midpoint is chosen even for a cursor near the center)", () => {
			const result = computeEditedEndpoint(
				selfLoopBase(),
				"target",
				{ x: 100, y: 100 }, // near the shape center
				{ id: "rect-1", object: rectFrame },
				fixedSource,
			);
			expect(result.target.anchor.kind).toBe("connectPoint");
		});

		it("exclusion does not apply when connecting to a different object (picks the nearest as-is)", () => {
			const other = { ...rectFrame, id: "rect-2" } as unknown as ObjectState;
			const result = computeEditedEndpoint(
				selfLoopBase(),
				"target",
				{ x: 100, y: 200 },
				{ id: "rect-2", object: other },
				fixedSource,
			);
			expect(result.target).toEqual({
				owner: { id: "rect-2" },
				anchor: { kind: "connectPoint", id: "bottomCenter" },
			});
		});
	});
});
