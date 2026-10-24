import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { AreaSelectionRect } from "../../feedback/AreaSelectionRect";
import { AxisLockGuide } from "../../feedback/AxisLockGuide";
import { DragGhost } from "../../feedback/DragGhost";
import { DrawingPreviewOverlay } from "../../feedback/DrawingPreviewOverlay";
import { PendingConnectorOverlay } from "../../feedback/PendingConnectorOverlay";
import { SelectionOverlay } from "../../feedback/SelectionOverlay";
import { SnapGuides } from "../../feedback/SnapGuides";
import { readSelectionDragKind } from "../../utils/readSelectionDragKind";
import { ConnectionAnchorsLayer } from "../ConnectionAnchorsLayer";
import { ConnectorControlsLayer } from "../ConnectorControlsLayer";
import { SelectionControlsLayer } from "../SelectionControlsLayer";
import { TransformControlsLayer } from "../TransformControlsLayer";
import { VertexControlsLayer } from "../VertexControlsLayer";

type CanvasControlLayersProps = {
	canvasState: CanvasControllerState;
	/** The draft-grafted objects (see useTextEditSession); only the selection outline reads them. */
	draftObjects: Record<string, ObjectState>;
};

/**
 * The controls and feedback drawn above the objects inside the canvas SVG, in
 * press and paint order: later siblings sit on top. Returns a fragment so no
 * wrapping element enters the SVG.
 *
 * Not memoized: `canvasState` changes on nearly every dispatch. Each layer is
 * memoized and handed the same field references as before, which is what holds.
 */
export const CanvasControlLayers = ({
	canvasState,
	draftObjects,
}: CanvasControlLayersProps) => {
	const { selection, objects, multiSelectGroup, mode, drag } = canvasState;
	const zoom = canvasState.viewport.zoom;
	const isTextEditing = mode.kind === "textEdit";
	const selectionDragKind = readSelectionDragKind(drag);
	const connectorDraft = drag?.kind === "connector" ? drag.draft : null;
	const selectionControlsProps = {
		selection,
		objects,
		zoom,
		isTextEditing,
		selectionDragKind,
	};

	return (
		<>
			<PendingConnectorOverlay
				connectorDraft={connectorDraft}
				objects={objects}
			/>
			<SelectionControlsLayer
				layer="belowOutline"
				{...selectionControlsProps}
			/>
			<SelectionOverlay
				selection={selection}
				objects={draftObjects}
				multiSelectGroup={multiSelectGroup}
				isTextEditing={isTextEditing}
			/>
			<SelectionControlsLayer
				layer="belowHandles"
				{...selectionControlsProps}
			/>
			<ConnectorControlsLayer
				selection={selection}
				objects={objects}
				zoom={zoom}
			/>
			<TransformControlsLayer
				selection={selection}
				objects={objects}
				multiSelectGroup={multiSelectGroup}
				zoom={zoom}
				isTextEditing={isTextEditing}
				selectionDragKind={selectionDragKind}
			/>
			<ConnectionAnchorsLayer
				selectedIds={selection.objectIds}
				objects={objects}
				zoom={zoom}
				connectorDraft={connectorDraft}
				isTextEditing={isTextEditing}
				selectionDragKind={selectionDragKind}
			/>
			<VertexControlsLayer
				selection={selection}
				objects={objects}
				zoom={zoom}
				selectionDragKind={selectionDragKind}
			/>
			<SelectionControlsLayer
				layer="aboveHandles"
				{...selectionControlsProps}
			/>
			<DragGhost stencilDrag={drag?.kind === "stencil" ? drag : null} />
			<DrawingPreviewOverlay
				preset={mode.kind === "draw" ? mode.preset : null}
				rect={drag?.kind === "draw" ? drag.rect : null}
			/>
			<AreaSelectionRect rect={drag?.kind === "marquee" ? drag.rect : null} />
			<SnapGuides snapFeedback={drag?.snapFeedback ?? null} zoom={zoom} />
			<AxisLockGuide
				axisLockFeedback={drag?.axisLockFeedback ?? null}
				viewport={canvasState.viewport}
			/>
		</>
	);
};
