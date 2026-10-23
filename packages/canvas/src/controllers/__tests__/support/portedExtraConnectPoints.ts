import { ObjectExtraConnectPointsRegistry } from "../../../rendering/objects/registry/ObjectExtraConnectPointsRegistry";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../states/objects/connector/ConnectorState";

/**
 * An extra connect points registry declaring one point for the `ported` type:
 * `east`, the middle of the right edge, leaving rightward (an ER entity's column
 * side in miniature). Swap it into a registries bundle in place of
 * `objectExtraConnectPoints`; without it an end on `east` collapses onto the
 * owner's center.
 */
export const createPortedExtraConnectPoints =
	(): ObjectExtraConnectPointsRegistry => {
		const registry = new ObjectExtraConnectPointsRegistry();
		registry.register("ported", ({ width }) => [
			{ id: "east", point: { x: width / 2, y: 0 }, direction: { x: 1, y: 0 } },
		]);
		return registry;
	};

/** An upright 100x100 `ported` shape centered on (cx, cy). */
export const portedShape = (id: string, cx: number, cy: number): ObjectState =>
	({
		id,
		type: "ported",
		features: { type: "ported", geometry: "rect", connectable: true },
		cx,
		cy,
		width: 100,
		height: 100,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	}) as unknown as ObjectState;

/**
 * An orthogonal connector joining two `ported` shapes east to east. With both
 * shapes in one column the route leaves each end through a 30px stub right of the
 * edge, which is the drawn extent no point of the shapes reaches.
 */
export const eastToEastConnector = (
	id: string,
	sourceId: string,
	targetId: string,
): ConnectorState =>
	({
		id,
		type: "connector",
		points: [],
		routing: "orthogonal",
		source: {
			owner: { id: sourceId },
			anchor: { kind: "connectPoint", id: "east" },
		},
		target: {
			owner: { id: targetId },
			anchor: { kind: "connectPoint", id: "east" },
		},
	}) as unknown as ConnectorState;
