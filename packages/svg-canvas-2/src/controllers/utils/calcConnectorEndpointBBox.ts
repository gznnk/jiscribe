import { resolveConnectorPoints } from "../../presentations/layers/content/utils/resolveConnectorPoints";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../states/objects/connections/connector/ConnectorState";

type BBox = { left: number; right: number; top: number; bottom: number };

/**
 * Connector のエンドポイント座標からバウンディングボックスを計算する（メニュー位置計算用）。
 * resolveConnectorPoints を使いアウトライン調整込みの視覚的に正確な位置を解決する。
 */
export const calcConnectorEndpointBBox = (
	connector: ConnectorState,
	objects: Record<string, ObjectState>,
): BBox | null => {
	const sourceObj = connector.source.owner
		? objects[connector.source.owner.id]
		: undefined;
	const targetObj = connector.target.owner
		? objects[connector.target.owner.id]
		: undefined;

	const points = resolveConnectorPoints(connector, sourceObj, targetObj);
	if (!points) {
		return null;
	}

	return {
		left: Math.min(points.source.x, points.target.x),
		right: Math.max(points.source.x, points.target.x),
		top: Math.min(points.source.y, points.target.y),
		bottom: Math.max(points.source.y, points.target.y),
	};
};
