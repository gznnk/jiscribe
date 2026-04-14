import type { TransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import type { CanvasState } from "../../../../states/canvas/CanvasState";
import { isTextStyleState } from "../../../../states/objects/base/TextStyleState";
import { TextEditor } from "../TextEditor";

type TextEditorLayerProps = {
	textEditState: CanvasState["textEditState"];
	objects: CanvasState["objects"];
	onTextChange: (text: string) => void;
	onEscape: () => void;
};

const TextEditorLayerComponent: React.FC<TextEditorLayerProps> = ({
	textEditState,
	objects,
	onTextChange,
	onEscape,
}) => {
	if (!textEditState) return null;

	const targetObject = objects[textEditState.objectId];
	if (!targetObject || !isTextStyleState(targetObject)) return null;

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
