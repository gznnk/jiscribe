import type { Point } from "@workspace/geometry";

import { adjustToOutline } from "./adjustToOutline";
import { resolveEndpoint } from "./resolveEndpoint";
import { isOrthogonalRouting } from "../../../../../schemas/objects/types/ConnectorRouting";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../../states/objects/connections/connector/ConnectorState";
import { resolveOrthogonalRoute } from "../routing";

/**
 * Pure function: Resolves connector endpoints to actual coordinates.
 * Handles both endpoint resolution and outline adjustment for center anchors.
 *
 * This function takes individual objects instead of the entire objects map,
 * enabling better memoization in React components.
 *
 * `waypoints` は source → target 順の中間経由点（ワールド座標）をそのまま返す。
 * 折れ線として描く際の端点アウトライン調整は、隣接する経由点（無ければ反対側の端点）に
 * 向けて行う。
 *
 * @param connectorState - The connector state to resolve
 * @param sourceObj - The source endpoint's owner object (or null if not found)
 * @param targetObj - The target endpoint's owner object (or null if not found)
 * @returns Resolved source / target points and intermediate waypoints, or null if resolution fails
 */
export const resolveConnectorPoints = (
	connectorState: ConnectorState,
	sourceObj: ObjectState | null | undefined,
	targetObj: ObjectState | null | undefined,
): { source: Point; target: Point; waypoints: Point[] } | null => {
	// Resolve endpoints to coordinates
	let sourcePoint = resolveEndpoint(connectorState.source, sourceObj);
	let targetPoint = resolveEndpoint(connectorState.target, targetObj);

	if (!sourcePoint || !targetPoint) {
		return null;
	}

	// 中間経由点（waypoint）。折れ線は source → ...waypoints → target を通る。
	const waypoints = connectorState.points ?? [];

	// center アンカーのアウトライン調整は「線が次に向かう点」へ向ける。
	// 経由点があれば最初／最後の経由点、無ければ反対側の端点を使う。
	const sourceToward = waypoints[0] ?? targetPoint;
	const targetToward = waypoints[waypoints.length - 1] ?? sourcePoint;

	// Adjust to outline for center anchors on rect/ellipse objects
	if (connectorState.source.anchor.kind === "center") {
		sourcePoint = adjustToOutline(sourcePoint, sourceToward, sourceObj);
		if (!sourcePoint) {
			return null;
		}
	}

	if (connectorState.target.anchor.kind === "center") {
		targetPoint = adjustToOutline(targetPoint, targetToward, targetObj);
		if (!targetPoint) {
			return null;
		}
	}

	// 自動直交ルーティング: 経路を描画時に算出し waypoints として返す（手動 points は使わない）。
	// routing 省略時は orthogonal が既定。直線にしたい場合のみ "straight" を明示する。
	if (isOrthogonalRouting(connectorState.routing)) {
		const path = resolveOrthogonalRoute(
			connectorState.source.anchor,
			connectorState.target.anchor,
			sourcePoint,
			targetPoint,
			sourceObj,
			targetObj,
		);
		return {
			source: path[0],
			target: path[path.length - 1],
			waypoints: path.slice(1, -1),
		};
	}

	return { source: sourcePoint, target: targetPoint, waypoints };
};
