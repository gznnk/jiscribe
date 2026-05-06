import { resolveEndpoint } from "../../presentations/layers/content/utils/resolveEndpoint";
import { resolveConnectorPoints } from "../../presentations/layers/content/utils/resolveConnectorPoints";
import type { ConnectorState } from "../../states/objects/connections/connector/ConnectorState";
import type { FreeEndpointRef } from "../../schemas/objects/types/EndpointRef";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * 図形削除に伴うコネクターの整理を行う。
 *
 * - 両端の接続先が削除対象 → コネクターも削除
 * - 片端のみ削除対象 → 削除される側のエンドポイントを Free に変換して保持
 *
 * @param state - 削除前のキャンバス状態（エンドポイント座標の解決に使用）
 * @param idsToDelete - 削除対象オブジェクトのIDセット
 */
export function cleanupConnectorsOnDelete(
	state: CanvasControllerState,
	idsToDelete: Set<string>,
): CanvasControllerState {
	const updatedObjects = { ...state.objects };
	const updatedConnectorIds = [...state.connectorIds];
	let hasChanges = false;

	for (let i = updatedConnectorIds.length - 1; i >= 0; i--) {
		const connectorId = updatedConnectorIds[i];

		// 既に削除対象のコネクター自身はスキップ
		if (idsToDelete.has(connectorId)) {
			continue;
		}

		const connector = state.objects[connectorId] as ConnectorState | undefined;
		if (!connector) continue;

		const sourceOwnerId = connector.source.owner?.id;
		const targetOwnerId = connector.target.owner?.id;

		const sourceDeleted = sourceOwnerId != null && idsToDelete.has(sourceOwnerId);
		const targetDeleted = targetOwnerId != null && idsToDelete.has(targetOwnerId);

		if (!sourceDeleted && !targetDeleted) {
			continue;
		}

		hasChanges = true;

		// 削除後に接続先が残らない場合（既に Free だった端 + 削除される端）はコネクターも削除
		const sourceWillBeFree = sourceOwnerId == null || sourceDeleted;
		const targetWillBeFree = targetOwnerId == null || targetDeleted;
		if (sourceWillBeFree && targetWillBeFree) {
			delete updatedObjects[connectorId];
			updatedConnectorIds.splice(i, 1);
			continue;
		}

		// 片端削除 → 削除される側を Free に変換
		// resolveConnectorPoints で center アンカーのアウトライン調整を含む視覚上の座標を取得。
		// 削除前の state.objects を使うため両端のオブジェクトがまだ存在している。
		const sourceObj = sourceOwnerId != null ? state.objects[sourceOwnerId] : null;
		const targetObj = targetOwnerId != null ? state.objects[targetOwnerId] : null;
		const resolved = resolveConnectorPoints(connector, sourceObj, targetObj);

		const updatedConnector = { ...connector };

		if (sourceDeleted) {
			const point =
				resolved?.source ??
				resolveEndpoint(connector.source, sourceObj) ??
				{ x: 0, y: 0 };
			const freeSource: FreeEndpointRef = { anchor: { kind: "free", point } };
			updatedConnector.source = freeSource;
		}

		if (targetDeleted) {
			const point =
				resolved?.target ??
				resolveEndpoint(connector.target, targetObj) ??
				{ x: 0, y: 0 };
			const freeTarget: FreeEndpointRef = { anchor: { kind: "free", point } };
			updatedConnector.target = freeTarget;
		}

		updatedObjects[connectorId] = updatedConnector as ConnectorState;
	}

	if (!hasChanges) {
		return state;
	}

	return {
		...state,
		objects: updatedObjects,
		connectorIds: updatedConnectorIds,
	};
}
