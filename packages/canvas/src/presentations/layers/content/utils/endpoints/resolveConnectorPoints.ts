import type { Point } from "@workspace/geometry";

import { adjustToOutline } from "./adjustToOutline";
import { resolveEndpoint } from "./resolveEndpoint";
import { isOrthogonalRouting } from "../../../../../schemas/objects/types/ConnectorRouting";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../../states/objects/connections/connector/ConnectorState";
import { resolveOrthogonalRoute } from "../routing";

/**
 * コネクターの両端点を実座標へ解決する純関数。端点解決と、center アンカーの輪郭調整を
 * まとめて行う。objects マップ全体ではなく対象図形を個別に受け取り、React コンポーネント
 * 側のメモ化を効かせる。
 *
 * `waypoints` は source → target 順の中間経由点（ワールド座標）をそのまま返す。
 * 折れ線として描く際の端点アウトライン調整は、隣接する経由点（無ければ反対側の端点）に
 * 向けて行う。
 *
 * @param connectorState - 解決対象のコネクター状態。両端点・routing・手動 points を持つ
 * @param sourceObj - source 端点の owner 図形。未参照（free 端点）や未発見なら null/undefined
 * @param targetObj - target 端点の owner 図形。未参照（free 端点）や未発見なら null/undefined
 * @returns 解決した source / target 点と中間経由点 waypoints。解決に失敗した場合は null
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

	// 自己ループ（両端が同一図形）は直線では退化するため、routing 指定に関わらず
	// 専用の矩形ループルート（直交）を使う。
	const isSelfLoop =
		!!sourceObj && !!targetObj && sourceObj.id === targetObj.id;

	// 自動直交ルーティング: 経路を描画時に算出し waypoints として返す（手動 points は使わない）。
	// routing 省略時は orthogonal が既定。直線にしたい場合のみ "straight" を明示する。
	if (isSelfLoop || isOrthogonalRouting(connectorState.routing)) {
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
