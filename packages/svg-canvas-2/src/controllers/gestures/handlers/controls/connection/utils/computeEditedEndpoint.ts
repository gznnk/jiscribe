import { roundToDecimal, type Point } from "@workspace/geometry";

import { calcNearestAnchor } from "./calcNearestAnchor";
import { PRECISION } from "../../../../../../constants/precision";
import type { EndpointRef } from "../../../../../../schemas/objects/types/EndpointRef";
import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../../../states/objects/connections/connector/ConnectorState";

/**
 * baseConnector の編集対象エンドポイントを、カーソル位置・接続先 hover に応じて
 * 更新した新しい ConnectorState を返す純粋関数。
 * - hoveredTarget があれば最近接アンカーへ接続（OwnedEndpointRef）
 * - なければカーソル位置（丸め済み）の FreeAnchor とする
 * 固定側エンドポイント・中間経由点（points）はそのまま保持する。
 *
 * hover 対象の解決（state.objects / registry 依存）は呼び出し側で行い、
 * 解決済みの hoveredTarget を渡すことでこの関数を純粋に保つ。
 */
export function computeEditedEndpoint(
	baseConnector: ConnectorState,
	endpointToUpdate: "source" | "target",
	cursor: Point,
	hoveredTarget: { id: string; object: ObjectState } | null,
): ConnectorState {
	const editedEndpoint: EndpointRef = hoveredTarget
		? {
				owner: {
					type: hoveredTarget.object.type,
					id: hoveredTarget.id,
				},
				anchor: calcNearestAnchor(hoveredTarget.object, cursor.x, cursor.y),
			}
		: {
				anchor: {
					kind: "free",
					point: {
						x: roundToDecimal(cursor.x, PRECISION.COORDINATE),
						y: roundToDecimal(cursor.y, PRECISION.COORDINATE),
					},
				},
			};

	return {
		...baseConnector,
		source:
			endpointToUpdate === "source" ? editedEndpoint : baseConnector.source,
		target:
			endpointToUpdate === "target" ? editedEndpoint : baseConnector.target,
	} as ConnectorState;
}
