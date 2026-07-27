import type { TransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import { LABEL_TEXT_SLOT_ID } from "../../../../constants/textSlotId";
import {
	resolveConnectorPoints,
	resolveEndpointOwner,
} from "../../../../presentations/layers/content/utils/endpoints";
import { calcConnectorLabelAnchor } from "../../../../presentations/layers/content/utils/label/calcConnectorLabelAnchor";
import type { ObjectOutlineRegistry } from "../../../../presentations/objects/registry/ObjectOutlineRegistry";
import type { ObjectTextRegionCalculator } from "../../../../presentations/objects/registry/ObjectTextRegionRegistry";
import { calcTextRegion } from "../../../../presentations/objects/utils/calcTextRegion";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import {
	isTextStyleState,
	type TextStyleState,
} from "../../../../states/objects/base/TextStyleState";
import type { ConnectorState } from "../../../../states/objects/connections/connector/ConnectorState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { useCanvasRegistries } from "../../../registries/CanvasRegistriesContext";
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
	outlineRegistry: ObjectOutlineRegistry,
): React.ReactElement | null {
	const sourceObj = resolveEndpointOwner(objects, connector.source);
	const targetObj = resolveEndpointOwner(objects, connector.target);
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
 * Renders the text editor for one slot of a shape that has text (such as rect), overlaid on that
 * slot's region (derived via calcTextRegion, the seam shared with the rendering-side TextOverlay).
 * The typography comes from the edited slot, so the textarea matches the overlay it replaces.
 *
 * @param target - The shape being edited (carries geometry)
 * @param objectId - ID of the target shape
 * @param slotId - The slot being edited; a key of `target.text`
 * @param text - The text being edited
 * @param handlers - Input and exit handlers
 * @param textRegionCalculator - Per-type calculator from ObjectTextRegionRegistry. Omitted = full bbox
 * @returns The text editor
 */
function renderTextEditor(
	target: ObjectState & TextStyleState & TransformedFrame,
	objectId: string,
	slotId: string,
	text: string,
	handlers: EditorHandlers,
	textRegionCalculator?: ObjectTextRegionCalculator,
): React.ReactElement {
	const textRegion = calcTextRegion(target, slotId, textRegionCalculator);
	const slot = target.text?.[slotId];
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
			textAlign={slot?.textAlign}
			verticalAlign={slot?.verticalAlign}
			fontColor={slot?.fontColor}
			fontSize={slot?.fontSize}
			fontFamily={slot?.fontFamily}
			fontWeight={slot?.fontWeight}
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
 * If there is an active text-editing session, dispatches to the dedicated editor for the edited slot.
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

	// The object kind decides the editor, not the slot id: a connector's one
	// editable text is its label (the LABEL_TEXT_SLOT_ID pseudo slot), while on
	// a shape "label" is a slot name like any other.
	if (targetObject.type === "connector") {
		if (textEditState.slotId !== LABEL_TEXT_SLOT_ID) {
			return null;
		}
		return renderConnectorLabelEditor(
			targetObject as ConnectorState,
			objects,
			textEditState.text,
			handlers,
			registries.objectOutline,
		);
	}

	// Any other slot id is a key of the shape's own text; one the shape does not
	// have has no region to place the editor in, so nothing is rendered.
	if (
		isTextStyleState(targetObject) &&
		targetObject.text !== undefined &&
		textEditState.slotId in targetObject.text
	) {
		// Shapes with text also carry geometry (cx/cy/width...).
		const geometryObject = targetObject as typeof targetObject &
			TransformedFrame;
		return renderTextEditor(
			geometryObject,
			textEditState.objectId,
			textEditState.slotId,
			textEditState.text,
			handlers,
			registries.objectTextRegion.get(targetObject.type),
		);
	}

	return null;
};

export const TextEditorLayer = memo(TextEditorLayerComponent);
