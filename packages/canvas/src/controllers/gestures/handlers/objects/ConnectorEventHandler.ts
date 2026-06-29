import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";
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
 * A double click on a connector starts editing its label (label.text).
 */
export const ConnectorEventHandler: GestureHandler = {
	supports(event: CanvasEvent): boolean {
		return (
			event.targetKind === "connector" &&
			// TODO: ここではじく必要はもうないかも
			(event.type === "click" ||
				event.type === "pressed" ||
				event.type === "doubleClick")
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

		const connectorId = event.targetId;

		// ダブルクリックでラベル編集を開始する。編集中の同一コネクターへの再ダブルクリックは
		// コミットせず編集を継続する（図形のテキスト編集と同じ扱い）。
		if (event.type === "doubleClick") {
			if (!connectorId) {
				return state;
			}
			const isReEditingSame = state.textEditState?.objectId === connectorId;
			const baseState = isReEditingSame ? state : commitTextEditIfNeeded(state);
			const connector = baseState.objects[connectorId];
			if (connector?.type !== "connector") {
				return baseState;
			}
			return {
				...baseState,
				selectedConnectorId: connectorId,
				selectedIds: [],
				multiSelectGroup: null,
				textEditState: {
					objectId: connectorId,
					text: (connector as ConnectorState).label?.text ?? "",
				},
			};
		}

		let nextState = commitTextEditIfNeeded(state);

		// コネクター上の押下でコンテキストメニューを閉じる（button は冒頭でガード済み、選択は click で行う）
		if (event.type === "pressed") {
			nextState = { ...nextState, contextMenuPosition: null };
		}

		// クリックでコネクターを選択（図形選択は解除して排他を保証）
		// すでに同じコネクターが選択済みの場合は変化なし
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
