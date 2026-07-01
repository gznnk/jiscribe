import type { CanvasControllerState } from "../../../../../../../controllers/CanvasTypes";
import type { ConnectorState } from "../../../../../../../states/objects/connections/connector/ConnectorState";
import { isSelfLoopConnector } from "../../../../../../utils/isSelfLoopConnector";

/**
 * 選択中コネクターが自己ループかどうか。自己ループは orthogonal 専用のため
 * routing トグルを描画しない（straight に切り替えると破綻するため）。
 */
export const isSelectedConnectorSelfLoop = (
	state: CanvasControllerState,
): boolean => {
	const id = state.selectedConnectorId;
	const connector = id !== null ? state.objects[id] : undefined;
	if (!connector || connector.type !== "connector") {
		return false;
	}
	return isSelfLoopConnector(connector as ConnectorState);
};
