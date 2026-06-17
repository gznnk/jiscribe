import { isSameEndpoint } from "../../../../../../schemas/objects/types/EndpointRef";
import type { ConnectorState } from "../../../../../../states/objects/connections/connector/ConnectorState";

/**
 * 2 つのコネクターの端点（source / target）と中間経由点が同値かどうかを判定する。
 * 「アンカーをつまんで元の位置に戻した」だけの no-op 編集を検出するために使う。
 */
export function isSameConnectorEndpoints(
	srcConnector: ConnectorState,
	clonedConnector: ConnectorState,
): boolean {
	if (!isSameEndpoint(srcConnector.source, clonedConnector.source)) {
		return false;
	}
	if (!isSameEndpoint(srcConnector.target, clonedConnector.target)) {
		return false;
	}

	const srcPoints = srcConnector.points;
	const clonedPoints = clonedConnector.points;
	if (srcPoints.length !== clonedPoints.length) {
		return false;
	}
	return srcPoints.every(
		(p, i) => p.x === clonedPoints[i].x && p.y === clonedPoints[i].y,
	);
}
