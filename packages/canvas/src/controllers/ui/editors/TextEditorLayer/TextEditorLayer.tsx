import type { TransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import { resolveConnectorPoints } from "../../../../presentations/layers/content/utils/endpoints";
import { calcConnectorLabelAnchor } from "../../../../presentations/layers/content/utils/label/calcConnectorLabelAnchor";
import { isTextStyleState } from "../../../../states/objects/base/TextStyleState";
import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { ConnectorLabelEditor } from "../ConnectorLabelEditor";
import { TextEditor } from "../TextEditor";

type TextEditorLayerProps = {
	textEditState: CanvasControllerState["textEditState"];
	objects: CanvasControllerState["objects"];
	onTextChange: (text: string) => void;
	onEscape: () => void;
};

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

	// TODO: もうちょい綺麗な書き方にしたい
	// コネクターは bbox を持たないため、経路の中点（ラベルアンカー）に専用エディタを出す。
	if (targetObject.type === "connector") {
		const connector = targetObject as ConnectorState;
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
				text={textEditState.text}
				fontColor={connector.label?.fontColor}
				fontSize={connector.label?.fontSize}
				fontWeight={connector.label?.fontWeight}
				onChange={onTextChange}
				onEscape={onEscape}
			/>
		);
	}

	if (!isTextStyleState(targetObject)) {
		return null;
	}

	// Type assertion: objects with text also have geometry properties
	const obj = targetObject as typeof targetObject & TransformedFrame;

	return (
		<TextEditor
			objectId={textEditState.objectId}
			text={textEditState.text}
			cx={obj.cx}
			cy={obj.cy}
			width={obj.width ?? 0}
			height={obj.height ?? 0}
			scaleX={obj.scaleX ?? 1}
			scaleY={obj.scaleY ?? 1}
			rotation={obj.rotation ?? 0}
			textType={obj.textType}
			textAlign={obj.textAlign}
			verticalAlign={obj.verticalAlign}
			fontColor={obj.fontColor}
			fontSize={obj.fontSize}
			fontFamily={obj.fontFamily}
			fontWeight={obj.fontWeight}
			onChange={onTextChange}
			onEscape={onEscape}
		/>
	);
};

export const TextEditorLayer = memo(TextEditorLayerComponent);
