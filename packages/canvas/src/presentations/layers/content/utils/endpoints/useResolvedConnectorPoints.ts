import type { Point } from "@workspace/geometry";
import { useMemo } from "react";

import { resolveConnectorPoints } from "./resolveConnectorPoints";
import type { CanvasState } from "../../../../../states/canvas/CanvasState";
import type { ConnectorState } from "../../../../../states/objects/connections/connector/ConnectorState";

/**
 * 解決済みのコネクター座標。
 *
 * `source` / `target` は端点（owned アンカーはアウトライン調整済み）。
 * `points` は折れ線描画用の点列で、`source → ...waypoints → target` の順に並ぶ
 * （`points[0]` が `source`、末尾が `target`）。中間経由点（waypoints）は
 * `points` に畳み込んであるため個別には公開しない。
 */
export type ResolvedConnectorPoints = {
	source: Point;
	target: Point;
	points: Point[];
};

/**
 * Custom hook: Resolves connector endpoints with optimized memoization.
 *
 * This hook extracts only the necessary objects (source and target) from the objects map,
 * so the memoization only re-runs when those specific objects change, not when any object
 * in the canvas changes.
 *
 * 折れ線描画用の点列 `points`（source → ...waypoints → target）も同じ useMemo 内で
 * 組み立てて返す。これにより `points` の参照が安定し、`memo` 済みの `Connector` が
 * 無関係な再描画で再レンダリングされない（端点をスカラーで渡していた頃と同じ挙動）。
 *
 * @param connectorState - The connector state to resolve
 * @param objects - Map of all objects in the canvas
 * @returns Resolved endpoints and the assembled point list, or null if resolution fails
 */
export const useResolvedConnectorPoints = (
	connectorState: ConnectorState,
	objects: CanvasState["objects"],
): ResolvedConnectorPoints | null => {
	// Extract only the objects we need for this connector
	const sourceObjId = connectorState.source.owner?.id ?? null;
	const targetObjId = connectorState.target.owner?.id ?? null;

	const sourceObj = sourceObjId ? objects[sourceObjId] : null;
	const targetObj = targetObjId ? objects[targetObjId] : null;

	// Memoize based on connector state and the specific objects it references
	// This avoids re-calculation when unrelated objects change
	return useMemo(() => {
		const resolved = resolveConnectorPoints(
			connectorState,
			sourceObj,
			targetObj,
		);
		if (!resolved) {
			return null;
		}
		return {
			source: resolved.source,
			target: resolved.target,
			points: [resolved.source, ...resolved.waypoints, resolved.target],
		};
	}, [connectorState, sourceObj, targetObj]);
};
