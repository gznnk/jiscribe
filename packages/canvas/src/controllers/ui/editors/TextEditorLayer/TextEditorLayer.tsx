import type { TransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import { resolveConnectorPoints } from "../../../../presentations/layers/content/utils/endpoints";
import { calcConnectorLabelAnchor } from "../../../../presentations/layers/content/utils/label/calcConnectorLabelAnchor";
import {
	isTextStyleState,
	type TextStyleState,
} from "../../../../states/objects/base/TextStyleState";
import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { ConnectorLabelEditor } from "../ConnectorLabelEditor";
import { TextEditor } from "../TextEditor";

/** 編集欄の入力・終了を親（Canvas）へ伝えるハンドラ。種別を問わず共通。 */
type EditorHandlers = {
	onChange: (text: string) => void;
	onEscape: () => void;
};

/**
 * コネクターのラベル編集欄を描画する。コネクターは bbox を持たないため、
 * 経路の中点（ラベルアンカー）に専用エディタを出す。経路やアンカーが
 * 解決できない場合は何も描画しない。
 *
 * @param connector - ラベルを編集する対象のコネクター
 * @param objects - 端点を解決するための全オブジェクト
 * @param text - 編集中のテキスト
 * @param handlers - 入力・終了ハンドラ
 * @returns ラベル編集欄、または描画できない場合は null
 */
function renderConnectorLabelEditor(
	connector: ConnectorState,
	objects: CanvasControllerState["objects"],
	text: string,
	handlers: EditorHandlers,
): React.ReactElement | null {
	const sourceObj = connector.source.owner
		? objects[connector.source.owner.id]
		: null;
	const targetObj = connector.target.owner
		? objects[connector.target.owner.id]
		: null;
	const resolved = resolveConnectorPoints(connector, sourceObj, targetObj);
	if (!resolved) {
		return null;
	}

	const points = [resolved.source, ...resolved.waypoints, resolved.target];
	const anchor = calcConnectorLabelAnchor(
		points,
		connector.label?.position,
		connector.label?.offset,
	);
	if (!anchor) {
		return null;
	}

	return (
		<ConnectorLabelEditor
			anchor={anchor}
			text={text}
			fontColor={connector.label?.fontColor}
			fontSize={connector.label?.fontSize}
			fontWeight={connector.label?.fontWeight}
			fill={connector.label?.fill}
			stroke={connector.label?.stroke}
			strokeWidth={connector.label?.strokeWidth}
			strokeDashType={connector.label?.strokeDashType}
			onChange={handlers.onChange}
			onEscape={handlers.onEscape}
		/>
	);
}

/**
 * テキストを持つ図形（rect など）の本文編集欄を、図形の bbox に重ねて描画する。
 *
 * @param target - テキストを編集する対象の図形（ジオメトリを持つ）
 * @param objectId - 対象図形の ID
 * @param text - 編集中のテキスト
 * @param handlers - 入力・終了ハンドラ
 * @returns テキスト編集欄
 */
function renderTextEditor(
	target: TextStyleState & TransformedFrame,
	objectId: string,
	text: string,
	handlers: EditorHandlers,
): React.ReactElement {
	return (
		<TextEditor
			objectId={objectId}
			text={text}
			cx={target.cx}
			cy={target.cy}
			width={target.width ?? 0}
			height={target.height ?? 0}
			scaleX={target.scaleX ?? 1}
			scaleY={target.scaleY ?? 1}
			rotation={target.rotation ?? 0}
			textType={target.textType}
			textAlign={target.textAlign}
			verticalAlign={target.verticalAlign}
			fontColor={target.fontColor}
			fontSize={target.fontSize}
			fontFamily={target.fontFamily}
			fontWeight={target.fontWeight}
			onChange={handlers.onChange}
			onEscape={handlers.onEscape}
		/>
	);
}

type TextEditorLayerProps = {
	textEditState: CanvasControllerState["textEditState"];
	objects: CanvasControllerState["objects"];
	onTextChange: (text: string) => void;
	onEscape: () => void;
};

/**
 * 編集中のテキストセッションがあれば、対象の種別ごとに専用の編集欄へ振り分ける。
 * コミット側の commitTextEditIfNeeded と対になる描画側のディスパッチャ。
 */
const TextEditorLayerComponent: React.FC<TextEditorLayerProps> = ({
	textEditState,
	objects,
	onTextChange,
	onEscape,
}) => {
	if (!textEditState) {
		return null;
	}

	const targetObject = objects[textEditState.objectId];
	if (!targetObject) {
		return null;
	}

	const handlers: EditorHandlers = { onChange: onTextChange, onEscape };

	if (targetObject.type === "connector") {
		return renderConnectorLabelEditor(
			targetObject as ConnectorState,
			objects,
			textEditState.text,
			handlers,
		);
	}

	if (isTextStyleState(targetObject)) {
		// テキストを持つ図形はジオメトリ（cx/cy/width...）も併せ持つ。
		const geometryObject = targetObject as typeof targetObject &
			TransformedFrame;
		return renderTextEditor(
			geometryObject,
			textEditState.objectId,
			textEditState.text,
			handlers,
		);
	}

	return null;
};

export const TextEditorLayer = memo(TextEditorLayerComponent);
