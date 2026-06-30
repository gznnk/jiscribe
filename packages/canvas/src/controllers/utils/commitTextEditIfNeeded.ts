import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isTextStyleState } from "../../states/objects/base/TextStyleState";
import type { ConnectorState } from "../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * コネクターのラベル編集をコミットする。テキストは `label.text`（ネスト）に書き戻す。
 * 空文字にしてもスタイル・配置は捨てず、再入力で復元できるよう label を残して
 * テキストだけ空にする。ただしテキストしか持たない素のラベルは残す意味がないので
 * 丸ごと取り除く（空ラベルのゴミを残さない＝ラベル無しに戻す）。
 */
function commitConnectorLabel(
	state: CanvasControllerState,
	connector: ConnectorState,
	text: string,
): CanvasControllerState {
	const currentText = connector.label?.text ?? "";
	if (text === currentText) {
		return { ...state, textEditState: null };
	}

	let nextConnector: ConnectorState;
	if (text === "") {
		// text 以外（スタイル・配置）が残っていれば label を保持し text だけ空にする。
		const { text: _clearedText, ...labelWithoutText } = connector.label ?? {};
		if (Object.keys(labelWithoutText).length === 0) {
			// 素のラベル（text のみ）は丸ごと取り除いてラベル無しに戻す。
			const { label: _removed, ...rest } = connector;
			nextConnector = rest as ConnectorState;
		} else {
			nextConnector = {
				...connector,
				label: { ...labelWithoutText, text: "" },
			} as ConnectorState;
		}
	} else {
		nextConnector = {
			...connector,
			label: { ...connector.label, text },
		} as ConnectorState;
	}

	return {
		...state,
		objects: {
			...state.objects,
			[connector.id]: nextConnector as ObjectState,
		},
		textEditState: null,
		commitVersion: state.commitVersion + 1,
	};
}

// TODO: もうちょい綺麗な書き方にしたい
/**
 * Commits the current text editing session if active.
 * Updates the object's text and clears textEditState.
 *
 * @param state - Current canvas controller state
 * @returns Updated canvas controller state with text committed, or unchanged state if not editing
 */
export function commitTextEditIfNeeded(
	state: CanvasControllerState,
): CanvasControllerState {
	if (!state.textEditState) {
		return state;
	}

	const { objectId, text } = state.textEditState;
	const targetObject = state.objects[objectId];

	if (!targetObject) {
		return {
			...state,
			textEditState: null,
		};
	}

	// コネクターは本文テキストでなくネストした label.text を更新する。
	if (targetObject.type === "connector") {
		return commitConnectorLabel(state, targetObject as ConnectorState, text);
	}

	if (!isTextStyleState(targetObject)) {
		return {
			...state,
			textEditState: null,
		};
	}

	if (text === targetObject.text) {
		return {
			...state,
			textEditState: null,
		};
	}

	return {
		...state,
		objects: {
			...state.objects,
			[objectId]: {
				...targetObject,
				text,
			} as ObjectState,
		},
		textEditState: null,
		commitVersion: state.commitVersion + 1,
	};
}
