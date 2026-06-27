import type { CanvasControllerState } from "../../../../../../../controllers/CanvasTypes";
import { isOrthogonalRouting } from "../../../../../../../schemas/objects/types/ConnectorRouting";
import type { ConnectorRouting } from "../../../../../../../schemas/objects/types/ConnectorRouting";

/**
 * 選択中コネクターの現在の routing を返す。
 * routing 省略時の既定は orthogonal。
 */
export const getSelectedRouting = (
	state: CanvasControllerState,
): ConnectorRouting => {
	const id = state.selectedConnectorId;
	const connector = id !== null ? state.objects[id] : undefined;
	const routing = (connector as Record<string, unknown> | undefined)
		?.routing as ConnectorRouting | undefined;
	return isOrthogonalRouting(routing) ? "orthogonal" : "straight";
};
