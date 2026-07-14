import type { TransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import { resolveConnectorPoints } from "../../../../presentations/layers/content/utils/endpoints";
import { calcConnectorLabelAnchor } from "../../../../presentations/layers/content/utils/label/calcConnectorLabelAnchor";
import type { ShapeOutlineRegistry } from "../../../../presentations/objects/registry/ShapeOutlineRegistry";
import type { TextRegionCalculator } from "../../../../presentations/objects/registry/TextRegionRegistry";
import { calcTextRegion } from "../../../../presentations/objects/utils/calcTextRegion";
import {
	isTextStyleState,
	type TextStyleState,
} from "../../../../states/objects/base/TextStyleState";
import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { useCanvasRegistries } from "../../../contexts/CanvasRegistriesContext";
import { ConnectorLabelEditor } from "../ConnectorLabelEditor";
import { TextEditor } from "../TextEditor";

/** Handlers that report editor input and exit to the parent (Canvas). Common across all types. */
type EditorHandlers = {
	onChange: (text: string) => void;
	onEscape: () => void;
};

/**
 * Renders the label editor for a connector. Since a connector has no bbox, the
 * dedicated editor is placed at the path midpoint (the label anchor). Renders
 * nothing if the path or anchor cannot be resolved.
 *
 * @param connector - The connector whose label is being edited
 * @param objects - All objects, used to resolve endpoints
 * @param text - The text being edited
 * @param handlers - Input and exit handlers
 * @returns The label editor, or null if it cannot be rendered
 */
function renderConnectorLabelEditor(
	connector: ConnectorState,
	objects: CanvasControllerState["objects"],
	text: string,
	handlers: EditorHandlers,
	outlineRegistry: ShapeOutlineRegistry,
): React.ReactElement | null {
	const sourceObj = connector.source.owner
		? objects[connector.source.owner.id]
		: null;
	const targetObj = connector.target.owner
		? objects[connector.target.owner.id]
		: null;
	const resolved = resolveConnectorPoints(
		connector,
		sourceObj,
		targetObj,
		outlineRegistry,
	);
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
 * Renders the body text editor for a shape that has text (such as rect), overlaid on the shape's
 * text region (derived via calcTextRegion, the seam shared with the rendering-side TextOverlay).
 *
 * @param target - The shape being edited (carries geometry)
 * @param objectId - ID of the target shape
 * @param text - The text being edited
 * @param handlers - Input and exit handlers
 * @param textRegionCalculator - Per-type calculator from TextRegionRegistry. Omitted = full bbox
 * @returns The text editor
 */
function renderTextEditor(
	target: TextStyleState & TransformedFrame,
	objectId: string,
	text: string,
	handlers: EditorHandlers,
	textRegionCalculator?: TextRegionCalculator,
): React.ReactElement {
	const textRegion = calcTextRegion(
		{ width: target.width ?? 0, height: target.height ?? 0 },
		textRegionCalculator,
	);
	return (
		<TextEditor
			objectId={objectId}
			text={text}
			cx={target.cx}
			cy={target.cy}
			x={textRegion.x}
			y={textRegion.y}
			width={textRegion.width}
			height={textRegion.height}
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
 * If there is an active text-editing session, dispatches to the dedicated editor for the target's type.
 * The render-side dispatcher that pairs with commitTextEditIfNeeded on the commit side.
 */
const TextEditorLayerComponent: React.FC<TextEditorLayerProps> = ({
	textEditState,
	objects,
	onTextChange,
	onEscape,
}) => {
	const registries = useCanvasRegistries();

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
			registries.shapeOutline,
		);
	}

	if (isTextStyleState(targetObject)) {
		// Shapes with text also carry geometry (cx/cy/width...).
		const geometryObject = targetObject as typeof targetObject &
			TransformedFrame;
		return renderTextEditor(
			geometryObject,
			textEditState.objectId,
			textEditState.text,
			handlers,
			registries.textRegion.get(targetObject.type),
		);
	}

	return null;
};

export const TextEditorLayer = memo(TextEditorLayerComponent);
