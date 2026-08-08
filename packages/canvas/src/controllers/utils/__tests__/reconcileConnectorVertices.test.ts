import type { Point } from "@workspace/geometry";
import { describe, expect, it } from "vitest";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../CanvasTypes";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import {
	reconcileConnectorVertices,
	reconcileConnectorVerticesIfCommitted,
} from "../reconcileConnectorVertices";

const registries = createTestRegistries();

/** Free-endpoint connector: the drawn path depends only on the endpoint coordinates. */
const makeConnector = (
	id: string,
	routing: "straight" | "orthogonal" | undefined,
	points: Point[],
	source: Point,
	target: Point,
): ConnectorState =>
	({
		id,
		type: "connector",
		routing,
		points,
		source: { anchor: { kind: "free", point: source } },
		target: { anchor: { kind: "free", point: target } },
	}) as unknown as ConnectorState;

const makeState = (
	objects: Record<string, ObjectState>,
	commitVersion = 0,
): CanvasControllerState =>
	({ objects, commitVersion }) as unknown as CanvasControllerState;

// Stored while the target sat at y=100; the target has since moved to y=120, so the drawn
// (aligned) path ends at {50,120} while the stored list still says {50,100}.
const staleConnector = () =>
	makeConnector(
		"c1",
		"orthogonal",
		[
			{ x: 50, y: 0 },
			{ x: 50, y: 100 },
		],
		{ x: 0, y: 0 },
		{ x: 100, y: 120 },
	);

describe("reconcileConnectorVertices", () => {
	it("rewrites stored vertices that lag behind the drawn (aligned) path", () => {
		const state = makeState({ c1: staleConnector() });

		const next = reconcileConnectorVertices(state, registries);
		const conn = next.objects["c1"] as ConnectorState;

		expect(conn.points).toEqual([
			{ x: 50, y: 0 },
			{ x: 50, y: 120 },
		]);
	});

	it("returns the same state reference when every connector already matches", () => {
		const state = makeState({
			c1: makeConnector(
				"c1",
				"orthogonal",
				[
					{ x: 50, y: 0 },
					{ x: 50, y: 120 },
				],
				{ x: 0, y: 0 },
				{ x: 100, y: 120 },
			),
		});

		expect(reconcileConnectorVertices(state, registries)).toBe(state);
	});

	it("touches only the diverged connector, keeping the others' references", () => {
		const aligned = makeConnector(
			"c2",
			"orthogonal",
			[{ x: 200, y: 0 }],
			{ x: 150, y: 0 },
			{ x: 200, y: 80 },
		);
		const state = makeState({ c1: staleConnector(), c2: aligned });

		const next = reconcileConnectorVertices(state, registries);

		expect(next.objects["c2"]).toBe(aligned);
		expect((next.objects["c1"] as ConnectorState).points[1]).toEqual({
			x: 50,
			y: 120,
		});
	});

	it("leaves a connector with no vertices to the engine", () => {
		const state = makeState({
			c1: makeConnector(
				"c1",
				undefined,
				[],
				{ x: 0, y: 0 },
				{ x: 100, y: 120 },
			),
		});

		expect(reconcileConnectorVertices(state, registries)).toBe(state);
	});

	it("leaves a straight connector alone — its raw list is the drawn path already", () => {
		const state = makeState({
			c1: makeConnector(
				"c1",
				"straight",
				[{ x: 30, y: 77 }],
				{ x: 0, y: 0 },
				{ x: 100, y: 120 },
			),
		});

		expect(reconcileConnectorVertices(state, registries)).toBe(state);
	});
});

describe("reconcileConnectorVerticesIfCommitted", () => {
	it("runs on a transition that raised commitVersion", () => {
		const previous = makeState({}, 3);
		const state = makeState({ c1: staleConnector() }, 4);

		const next = reconcileConnectorVerticesIfCommitted(
			state,
			previous,
			registries,
		);

		expect((next.objects["c1"] as ConnectorState).points[1]).toEqual({
			x: 50,
			y: 120,
		});
	});

	it("does nothing when commitVersion is unchanged (undo/redo restore, transient frames)", () => {
		const previous = makeState({}, 3);
		const state = makeState({ c1: staleConnector() }, 3);

		expect(
			reconcileConnectorVerticesIfCommitted(state, previous, registries),
		).toBe(state);
	});
});
