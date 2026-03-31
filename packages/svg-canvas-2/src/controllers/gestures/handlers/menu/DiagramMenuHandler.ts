import { handlePropertyUpdate } from "./utils/handlePropertyUpdate";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../../../registry/GestureHandlerRegistryTypes";
import type { CanvasState } from "../../../../states/canvas/CanvasState";
import { handleCommand } from "../../../commands/handlers/handleCommand";

/**
 * DiagramMenu 項目のクリックを処理する GestureHandler。
 * targetKind が "diagram-menu" の場合に処理を行う。
 *
 * アクション ID のフォーマット:
 * - `toggle-{sectionId}` → セクションの開閉を切り替え
 * - `set-{property}:{value}` → 選択オブジェクトのプロパティを更新
 * - `{commandId}` → コマンドを実行
 */
export const DiagramMenuHandler: GestureHandler = {
	supports(event: CanvasEvent) {
		return event.targetKind === "diagram-menu";
	},

	handle(state: CanvasState, event: CanvasEvent): CanvasState {
		if (event.type === "click" && event.targetId) {
			// targetId から "diagram-menu:" プレフィックスを除去してIDを取得
			const actionId = event.targetId.replace("diagram-menu:", "");

			// toggle ボタン: セクションの開閉を切り替える
			if (actionId.startsWith("toggle-")) {
				const sectionId = actionId.replace("toggle-", "");
				return {
					...state,
					diagramMenuOpenId:
						state.diagramMenuOpenId === sectionId ? null : sectionId,
				};
			}

			// プロパティ更新: set-{property}:{value}
			if (actionId.startsWith("set-")) {
				const rest = actionId.slice(4); // "set-" を除去
				const colonIndex = rest.indexOf(":");
				if (colonIndex !== -1) {
					const property = rest.slice(0, colonIndex);
					const value = rest.slice(colonIndex + 1);
					const newState = handlePropertyUpdate(state, property, value);
					return {
						...newState,
						diagramMenuOpenId: null,
						lastCommitTime: event.time,
					};
				}
			}

			// コマンドボタン: コマンドを実行
			return handleCommand(state, actionId);
		}

		return state;
	},
};
