import type {
	CanvasEvent,
	GestureHandler,
} from "../../../../registry/GestureHandlerRegistryTypes";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { commitTextEditIfNeeded } from "../../../utils/commitTextEditIfNeeded";

/**
 * Handles click events on connectors.
 * Connectors are selected independently from objects (selectedConnectorId vs selectedIds).
 * Only single selection is supported; selecting a connector clears selectedIds, and vice versa.
 */
export const ConnectorEventHandler: GestureHandler = {
	supports(event: CanvasEvent): boolean {
		return event.targetKind === "connector" && event.type === "click";
	},

	handle(
		state: CanvasControllerState,
		event: CanvasEvent,
	): CanvasControllerState {
		// Only left-click (button 0)
		if (event.button !== 0) {
			return state;
		}

		const nextState = commitTextEditIfNeeded(state);

		const connectorId = event.targetId;
		if (!connectorId) {
			return nextState;
		}

		// すでに同じコネクターが選択済みの場合は変化なし
		if (nextState.selectedConnectorId === connectorId) {
			return nextState;
		}

		return {
			...nextState,
			selectedConnectorId: connectorId,
			// 図形選択は解除して排他を保証
			selectedIds: [],
			multiSelectGroup: null,
		};
	},
};
