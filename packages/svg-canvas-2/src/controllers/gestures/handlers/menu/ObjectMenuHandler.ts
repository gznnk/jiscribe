import type {
	CanvasEvent,
	GestureHandler,
} from "../../../../registry/GestureHandlerRegistryTypes";
import { handleCommand } from "../../../commands/handlers/handleCommand";
import { handlePropertyUpdate } from "../../../utils/handlePropertyUpdate";

/**
 * ObjectMenu 項目の操作を処理する GestureHandler。
 * targetKind が "object-menu" の場合に処理を行う。
 *
 * 処理するイベント:
 * - click: メニュー項目のクリック
 * - drag: スライダーのリアルタイム更新（履歴記録なし）
 * - dragEnd: スライダーの最終値確定 + 履歴記録
 *
 * targetId のフォーマット:
 * - `object-menu:toggle:{sectionId}` → セクションの開閉を切り替え
 * - `object-menu:set:{property}:{value}` → 選択オブジェクトのプロパティを更新
 * - `object-menu:command:{commandId}` → コマンドを実行
 * - `object-menu:slider:{property}` → スライダーによるプロパティ更新
 * - `object-menu:number-input:{property}` → 数値入力によるプロパティ更新
 */
export const ObjectMenuHandler: GestureHandler = {
	supports(event: CanvasEvent) {
		return event.targetKind === "object-menu";
	},

	handle(state, event) {
		// スライダー操作: drag / dragEnd
		if (event.targetId?.startsWith("object-menu:slider:")) {
			// pressed, dragStart, click イベントは何もせず状態を維持
			if (
				event.type === "pressed" ||
				event.type === "dragStart" ||
				event.type === "click" ||
				event.type === "doubleClick"
			) {
				return state;
			}

			// 入力値が存在しない場合は何もしない
			if (event.inputValue === undefined) {
				console.warn("[ObjectMenuHandler] No input value found");
				return state;
			}

			// targetId から "object-menu:slider:" プレフィックスを除去してプロパティ名を取得
			const property = event.targetId.slice("object-menu:slider:".length);
			if (!property) {
				console.warn("[ObjectMenuHandler] No property found in targetId");
				return state;
			}

			// drag イベント: リアルタイム更新（履歴記録なし、メニュー維持）
			if (event.type === "drag") {
				return handlePropertyUpdate(state, property, event.inputValue);
			}

			// dragEnd イベント: 最終値確定（履歴記録は handleGesture に委譲）
			if (event.type === "dragEnd") {
				const newState = handlePropertyUpdate(
					state,
					property,
					event.inputValue,
				);
				return { ...newState, lastCommitTime: event.time };
			}

			return state;
		}

		// メニュー項目のクリック
		if (event.type === "click" && event.targetId) {
			// targetId から "object-menu:" プレフィックスを除去してアクションを取得
			const actionId = event.targetId.slice("object-menu:".length);

			// toggle ボタン: セクションの開閉を切り替える
			if (actionId.startsWith("toggle:")) {
				const sectionId = actionId.slice("toggle:".length);
				return {
					...state,
					objectMenuOpenId:
						state.objectMenuOpenId === sectionId ? null : sectionId,
				};
			}

			// プロパティ更新: set:{property}:{value}
			if (actionId.startsWith("set:")) {
				const rest = actionId.slice("set:".length);
				const colonIndex = rest.indexOf(":");
				if (colonIndex !== -1) {
					const property = rest.slice(0, colonIndex);
					const value = rest.slice(colonIndex + 1);
					const newState = handlePropertyUpdate(state, property, value);
					// 履歴記録は handleGesture に委譲するため、lastCommitTime のみ更新
					return { ...newState, lastCommitTime: event.time };
				}
			}

			// コマンドボタン: command:{commandId}
			if (actionId.startsWith("command:")) {
				const commandId = actionId.slice("command:".length);
				return handleCommand(state, commandId);
			}
		}

		return state;
	},
};
