import { handleCommand } from "../../../commands/handlers/handleCommand";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";

/**
 * 上部ツールバーのボタン操作を処理する GestureHandler。
 * targetKind が "toolbar" の場合に処理を行う。
 *
 * targetId のフォーマット:
 * - `toolbar:command:{commandId}` → コマンドを実行（canExecute は handleCommand 側で判定）
 *
 * 実行系（ズーム等）はコマンドシステムに集約し、キーボードショートカットや
 * コンテキストメニューと同一の経路（handleCommand）を通す。
 *
 * click と doubleClick を等価に扱う点に注意。
 * GestureRecognizer は click / doubleClick を排他的に発火する（同一ターゲットを
 * DOUBLE_CLICK_THRESHOLD 内に連打すると 2 回目以降が doubleClick になる）。
 * ツールバーの反復コマンド（ズーム ± 等）にダブルクリック固有の意味は無いため、
 * doubleClick も 1 回の実行として扱う。これにより「連打＝毎回実行」が成立する。
 */
const COMMAND_PREFIX = "toolbar:command:";

export const ToolbarHandler: GestureHandler = {
	supports(event: CanvasEvent) {
		return event.targetKind === "toolbar";
	},

	handle(state, event) {
		let nextState = state;

		// ツールバー上の押下でコンテキストメニューを閉じる
		if (event.type === "pressed") {
			if (event.button === 0) {
				nextState = { ...nextState, contextMenuPosition: null };
			}
		}

		const isActivation = event.type === "click" || event.type === "doubleClick";
		if (isActivation && event.targetId?.startsWith(COMMAND_PREFIX)) {
			const commandId = event.targetId.slice(COMMAND_PREFIX.length);
			return handleCommand(nextState, commandId);
		}

		return nextState;
	},
};
