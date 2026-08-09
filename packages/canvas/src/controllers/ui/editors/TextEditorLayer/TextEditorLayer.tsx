import type { BoundingBox, TransformedFrame } from "@workspace/geometry";
import { memo } from "react";

import {
	resolveConnectorPoints,
	resolveEndpointOwner,
} from "../../../../presentations/layers/content/utils/endpoints";
import { calcConnectorLabelAnchor } from "../../../../presentations/layers/content/utils/label/calcConnectorLabelAnchor";
import type { ConnectorLabelPlacement } from "../../../../presentations/layers/content/utils/label/calcConnectorLabelPlacement";
import type { ObjectAnchorRegionRegistry } from "../../../../presentations/objects/registry/ObjectAnchorRegionRegistry";
import type { ObjectExtraConnectPointsRegistry } from "../../../../presentations/objects/registry/ObjectExtraConnectPointsRegistry";
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
import { resolveTextEditOverflow } from "../ObjectTextEditOverflowRegistry";
import type { ObjectTextEditOverflowResolver } from "../ObjectTextEditOverflowTypes";
import { TextEditor } from "../TextEditor";

/** Handlers that report editor input, caret and exit to the parent (Canvas). Common across all types. */
type EditorHandlers = {
	onChange: (text: string) => void;
	onEscape: () => void;
	/** Where the caret moved to, in world coordinates (see useRevealTextEditCaret). */
	onCaretMove: (caretWorldBox: BoundingBox) => void;
};

/**
 * Renders the label editor for a connector. Since a connector has no bbox, the
 * dedicated editor is placed on the label anchor: the pending placement of a
 * label being created, else the label's own (defaulting to the path midpoint).
 * Renders nothing if the path or anchor cannot be resolved.
 *
 * @param connector - The connector whose label is being edited
 * @param objects - All objects, used to resolve endpoints
 * @param text - The text being edited
 * @param pendingPlacement - Placement of the label being created, if any. Takes
 *   precedence over the label's own keys, which for a label being created can
 *   only be leftovers from a deleted one (a re-edit carries no pending placement)
 * @param handlers - Input and exit handlers
 * @param outlineRegistry - Per-canvas ObjectOutlineRegistry, so the path the anchor
 *   is measured along is the rendered one
 * @param anchorRegionRegistry - Per-canvas ObjectAnchorRegionRegistry, the companion of
 *   `outlineRegistry` in path resolution
 * @param extraConnectPointsRegistry - Per-canvas ObjectExtraConnectPointsRegistry, the other
 *   companion of `outlineRegistry` in path resolution
 * @returns The label editor, or null if it cannot be rendered
 */
function renderConnectorLabelEditor(
	connector: ConnectorState,
	objects: CanvasControllerState["objects"],
	text: string,
	pendingPlacement: ConnectorLabelPlacement | undefined,
	handlers: EditorHandlers,
	outlineRegistry: ObjectOutlineRegistry,
	anchorRegionRegistry: ObjectAnchorRegionRegistry,
	extraConnectPointsRegistry: ObjectExtraConnectPointsRegistry,
): React.ReactElement | null {
	const sourceObj = resolveEndpointOwner(objects, connector.source);
	const targetObj = resolveEndpointOwner(objects, connector.target);
	const resolved = resolveConnectorPoints(
		connector,
		sourceObj,
		targetObj,
		outlineRegistry,
		anchorRegionRegistry,
		extraConnectPointsRegistry,
	);
	if (!resolved) {
		return null;
	}

	const points = [resolved.source, ...resolved.waypoints, resolved.target];
	const anchor = calcConnectorLabelAnchor(
		points,
		pendingPlacement?.position ?? connector.label?.position,
		pendingPlacement?.offset ?? connector.label?.offset,
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
			onCaretMove={handlers.onCaretMove}
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
 * @param textEditOverflowResolver - Per-type resolver from ObjectTextEditOverflowRegistry. Omitted = the slot scrolls
 * @returns The text editor
 */
function renderTextEditor(
	target: ObjectState & TextStyleState & TransformedFrame,
	objectId: string,
	slotId: string,
	text: string,
	handlers: EditorHandlers,
	textRegionCalculator?: ObjectTextRegionCalculator,
	textEditOverflowResolver?: ObjectTextEditOverflowResolver,
): React.ReactElement {
	const textRegion = calcTextRegion(target, slotId, textRegionCalculator);
	const slot = target.text?.[slotId];
	// How far a growing editor may extend: from the region's top edge down to the
	// shape's bottom edge (local coordinates, origin at the shape center). A region
	// already at or below that edge yields 0 rather than a negative length.
	const growLimit = Math.max(target.height / 2 - textRegion.y, 0);
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
			overflow={resolveTextEditOverflow(slotId, textEditOverflowResolver)}
			growLimit={growLimit}
			textAlign={slot?.textAlign}
			verticalAlign={slot?.verticalAlign}
			fontColor={slot?.fontColor}
			fontSize={slot?.fontSize}
			fontFamily={slot?.fontFamily}
			fontWeight={slot?.fontWeight}
			fontStyle={slot?.fontStyle}
			textDecoration={slot?.textDecoration}
			onChange={handlers.onChange}
			onEscape={handlers.onEscape}
			onCaretMove={handlers.onCaretMove}
		/>
	);
}

type TextEditorLayerProps = {
	textEditState: CanvasControllerState["textEditState"];
	objects: CanvasControllerState["objects"];
	onTextChange: (text: string) => void;
	onEscape: () => void;
	/** Where the caret moved to, in world coordinates (see useRevealTextEditCaret). */
	onCaretMove: (caretWorldBox: BoundingBox) => void;
};

/**
 * If there is an active text-editing session, dispatches to the dedicated editor for the editing kind.
 * The render-side dispatcher that pairs with commitTextEditIfNeeded on the commit side.
 */
const TextEditorLayerComponent: React.FC<TextEditorLayerProps> = ({
	textEditState,
	objects,
	onTextChange,
	onEscape,
	onCaretMove,
}) => {
	const registries = useCanvasRegistries();

	if (!textEditState) {
		return null;
	}

	const targetObject = objects[textEditState.objectId];
	if (!targetObject) {
		return null;
	}

	const handlers: EditorHandlers = {
		onChange: onTextChange,
		onEscape,
		onCaretMove,
	};

	if (textEditState.kind === "connectorLabel") {
		if (targetObject.type !== "connector") {
			return null;
		}
		return renderConnectorLabelEditor(
			targetObject as ConnectorState,
			objects,
			textEditState.text,
			textEditState.placement,
			handlers,
			registries.objectOutline,
			registries.objectAnchorRegion,
			registries.objectExtraConnectPoints,
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
			registries.objectTextEditOverflow.get(targetObject.type),
		);
	}

	return null;
};

export const TextEditorLayer = memo(TextEditorLayerComponent);
