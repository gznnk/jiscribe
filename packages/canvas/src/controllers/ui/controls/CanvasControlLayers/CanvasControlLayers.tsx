import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { AreaSelectionRect } from "../../feedback/AreaSelectionRect";
import { AxisLockGuide } from "../../feedback/AxisLockGuide";
import { DragGhost } from "../../feedback/DragGhost";
import { DrawingPreviewOverlay } from "../../feedback/DrawingPreviewOverlay";
import { PendingConnectorOverlay } from "../../feedback/PendingConnectorOverlay";
import { SelectionOverlay } from "../../feedback/SelectionOverlay";
import { SnapGuides } from "../../feedback/SnapGuides";
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
	const { selection, objects, multiSelectGroup, connectorDraft } = canvasState;
	const zoom = canvasState.viewport.zoom;
	const isTextEditing = !!canvasState.textEditState;
	const activeDragKind = canvasState.activeDrag?.kind ?? null;
	const selectionControlsProps = {
		selection,
		objects,
		zoom,
		isTextEditing,
		activeDragKind,
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
				activeDragKind={activeDragKind}
			/>
			<ConnectionAnchorsLayer
				selectedIds={selection.objectIds}
				objects={objects}
				zoom={zoom}
				connectorDraft={connectorDraft}
				isTextEditing={isTextEditing}
				activeDragKind={activeDragKind}
			/>
			<VertexControlsLayer
				selection={selection}
				objects={objects}
				zoom={zoom}
				activeDragKind={activeDragKind}
			/>
			<SelectionControlsLayer
				layer="aboveHandles"
				{...selectionControlsProps}
			/>
			<DragGhost stencilLibraryDrag={canvasState.stencilLibraryDrag} />
			<DrawingPreviewOverlay shapeDrawing={canvasState.shapeDrawing} />
			<AreaSelectionRect areaSelection={canvasState.areaSelection} />
			<SnapGuides snapFeedback={canvasState.snapFeedback} zoom={zoom} />
			<AxisLockGuide
				axisLockFeedback={canvasState.axisLockFeedback}
				viewport={canvasState.viewport}
			/>
		</>
	);
};
