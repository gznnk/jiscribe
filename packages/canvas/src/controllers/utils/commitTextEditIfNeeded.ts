import type { ObjectState } from "../../states/objects/base/ObjectState";
import {
	isTextStyleState,
	type TextStyleState,
} from "../../states/objects/base/TextStyleState";
import type { ConnectorState } from "../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../CanvasTypes";

/**
 * 編集セッションを終了するだけ（オブジェクトは変更しない）。
 *
 * @param state - 現在のキャンバスコントローラー状態
 * @returns textEditState をクリアした新しい状態
 */
function clearTextEdit(state: CanvasControllerState): CanvasControllerState {
	return { ...state, textEditState: null };
}

/**
 * コネクターのラベル編集をコミットする。テキストは `label.text`（ネスト）に書き戻す。
 * 空文字にしてもスタイル・配置は捨てず、再入力で復元できるよう label を残して
 * テキストだけ空にする。ただしテキストしか持たない素のラベルは残す意味がないので
 * 丸ごと取り除く（空ラベルのゴミを残さない＝ラベル無しに戻す）。
 *
 * @param state - 現在のキャンバスコントローラー状態
 * @param connector - ラベルを更新する対象のコネクター
 * @param text - 書き戻す編集後のテキスト
 * @returns ラベルを反映した新しい状態（変化が無ければ textEditState のみクリア）
 */
function commitConnectorLabel(
	state: CanvasControllerState,
	connector: ConnectorState,
	text: string,
): CanvasControllerState {
	const currentText = connector.label?.text ?? "";
	if (text === currentText) {
		return clearTextEdit(state);
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

/**
 * テキストを持つ図形（rect など）の本文テキストをコミットする。
 * 変化が無ければ編集セッションを閉じるだけで commitVersion は据え置く。
 *
 * @param state - 現在のキャンバスコントローラー状態
 * @param target - テキストを更新する対象の図形
 * @param text - 書き戻す編集後のテキスト
 * @returns テキストを反映した新しい状態（変化が無ければ textEditState のみクリア）
 */
function commitTextStyleText(
	state: CanvasControllerState,
	target: TextStyleState & ObjectState,
	text: string,
): CanvasControllerState {
	if (text === target.text) {
		return clearTextEdit(state);
	}

	return {
		...state,
		objects: {
			...state.objects,
			[target.id]: { ...target, text } as ObjectState,
		},
		textEditState: null,
		commitVersion: state.commitVersion + 1,
	};
}

/**
 * 編集中のテキストセッションがあればコミットする。
 * 対象の種別ごとに専用のコミット関数へ振り分けるだけのディスパッチャ。
 *
 * @param state - 現在のキャンバスコントローラー状態
 * @returns テキストを反映した新しい状態（編集中でなければ元の状態をそのまま返す）
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
		return clearTextEdit(state);
	}
	// コネクターは本文テキストでなくネストした label.text を更新する。
	if (targetObject.type === "connector") {
		return commitConnectorLabel(state, targetObject as ConnectorState, text);
	}
	if (isTextStyleState(targetObject)) {
		return commitTextStyleText(state, targetObject, text);
	}
	return clearTextEdit(state);
}
