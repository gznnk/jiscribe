import type { CanvasControllerState } from "../../../CanvasTypes";
import { commitTextEditIfNeeded } from "../../../utils/commitTextEditIfNeeded";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";

/**
 * Handles click events on connectors.
 * Connectors are selected independently from objects (selectedConnectorId vs selectedIds).
 * Only single selection is supported; selecting a connector clears selectedIds, and vice versa.
 */
export const ConnectorEventHandler: GestureHandler = {
	supports(event: CanvasEvent): boolean {
		return (
			event.targetKind === "connector" &&
			(event.type === "click" || event.type === "pressed")
		);
	},

	handle(
		state: CanvasControllerState,
		event: CanvasEvent,
	): CanvasControllerState {
		// Only left-click (button 0)
		if (event.button !== 0) {
			return state;
		}

		let nextState = commitTextEditIfNeeded(state);

		// コネクター上の押下でコンテキストメニューを閉じる（button は冒頭でガード済み、選択は click で行う）
		if (event.type === "pressed") {
			nextState = { ...nextState, contextMenuPosition: null };
		}

		// クリックでコネクターを選択（図形選択は解除して排他を保証）
		// すでに同じコネクターが選択済みの場合は変化なし
		const connectorId = event.targetId;
		if (
			event.type === "click" &&
			connectorId &&
			nextState.selectedConnectorId !== connectorId
		) {
			nextState = {
				...nextState,
				selectedConnectorId: connectorId,
				selectedIds: [],
				multiSelectGroup: null,
			};
		}

		return nextState;
	},
};
