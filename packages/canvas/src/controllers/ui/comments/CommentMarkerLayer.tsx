import type { CommentThreadDoc } from "@jiscribe/doc/model/objects/base/CommentThreadDoc";
import {
	countOpenCommentThreads,
	readCommentThreads,
} from "@jiscribe/doc/model/objects/base/CommentThreadDoc";
import { memo, useMemo, useRef } from "react";

import { CommentMarker } from "./CommentMarker";
import { CommentMarkerPanelWrapper } from "./CommentMarkerStyled";
import { CommentPanel } from "./CommentPanel";
import {
	COMMENT_MARKER_GAP_Y,
	COMMENT_MARKER_HEIGHT,
	COMMENT_MARKER_PANEL_GAP,
	COMMENT_MARKER_WIDTH,
	COMMENTS_SECTION_ID,
} from "./CommentsConstants";
import { useViewportClampOffset } from "./hooks/useViewportClampOffset";
import { resolveCommentTargetLabel } from "./utils/resolveCommentTargetLabel";
import type { CanvasControllerState } from "../../CanvasTypes";
import { useCanvasMessages } from "../../messages/CanvasMessagesContext";
import type { CommentOp } from "../../reducer/CanvasActions";
import { useCanvasRegistries } from "../../registries/CanvasRegistriesContext";
import { calcObjectBoundingBox } from "../../utils/calcObjectBoundingBox";
import { resolveMetaTargetId } from "../../utils/resolveMetaTargetId";

/** One object that carries threads, placed in the overlay's coordinate system. */
type PlacedCommentMarker = {
	objectId: string;
	threads: CommentThreadDoc[];
	openCount: number;
	left: number;
	top: number;
};

type CommentMarkerLayerProps = {
	/** The state the markers are placed from: the objects, the camera and the open menu section. */
	canvasState: CanvasControllerState;
	/**
	 * Whether the ObjectMenu is withheld by the current state
	 * (`isObjectMenuSuppressed`). Passed in rather than computed here so the
	 * comments folder stays free of ObjectMenu imports; while it is true the
	 * marker is the only way the panel can be shown, so this layer draws it.
	 */
	isObjectMenuSuppressed: boolean;
	/** Display name written onto posts; absent or blank makes the panel read-only. */
	commentAuthor?: string;
	/** Applies one op to the document. */
	onCommentUpdate: (op: CommentOp) => void;
};

/**
 * Marks every object that carries comment threads, and shows the thread panel
 * beside a marker while the ObjectMenu that normally holds it is withheld
 * (the properties sidebar being the case that happens in practice).
 *
 * Rendered inside ScrollSyncedOverlay, so positions are canvas coordinates
 * multiplied by the zoom while the markers themselves keep their px size (see
 * the ScrollSyncedOverlay comment in CanvasStyled.ts). Every object is
 * considered, connectors included, since `meta` belongs to all of them.
 */
const CommentMarkerLayerComponent: React.FC<CommentMarkerLayerProps> = ({
	canvasState,
	isObjectMenuSuppressed,
	commentAuthor,
	onCommentUpdate,
}) => {
	const messages = useCanvasMessages();
	const { objectVisualBounds } = useCanvasRegistries();
	const panelRef = useRef<HTMLDivElement>(null);

	const { objects, viewport } = canvasState;
	const zoom = viewport.zoom;

	const markers = useMemo<PlacedCommentMarker[]>(() => {
		const placed: PlacedCommentMarker[] = [];
		for (const obj of Object.values(objects)) {
			const threads = readCommentThreads(obj.meta);
			if (threads.length === 0) {
				continue;
			}
			const bbox = calcObjectBoundingBox(obj, objects, objectVisualBounds);
			if (!bbox) {
				continue;
			}
			placed.push({
				objectId: obj.id,
				threads,
				openCount: countOpenCommentThreads(threads),
				// Sits just above the top edge, right-aligned with the object. The rotation
				// handle hangs off the corner diagonally outside (TransformControls),
				// which leaves this spot clear. Rounded to whole px: a fractional offset
				// renders the pin's dots between pixels, blurred.
				left: Math.round(bbox.right * zoom) - COMMENT_MARKER_WIDTH,
				top:
					Math.round(bbox.top * zoom) -
					COMMENT_MARKER_HEIGHT -
					COMMENT_MARKER_GAP_Y,
			});
		}
		return placed;
	}, [objects, objectVisualBounds, zoom]);

	const commentTargetId = resolveMetaTargetId(canvasState);
	const isPanelOpen = canvasState.objectMenuOpenId === COMMENTS_SECTION_ID;
	// The panel belongs to the ObjectMenu's dropdown whenever that menu is shown;
	// this layer only takes it over for the states that withhold the menu.
	const markerPanelTarget =
		isPanelOpen && isObjectMenuSuppressed && commentTargetId !== null
			? markers.find((marker) => marker.objectId === commentTargetId)
			: undefined;
	const markerPanelObject =
		markerPanelTarget === undefined
			? undefined
			: objects[markerPanelTarget.objectId];

	const panelAnchorLeft =
		markerPanelTarget === undefined
			? 0
			: markerPanelTarget.left +
				COMMENT_MARKER_WIDTH +
				COMMENT_MARKER_PANEL_GAP;
	const panelAnchorTop =
		markerPanelTarget === undefined ? 0 : markerPanelTarget.top;
	const { offsetX, offsetY } = useViewportClampOffset(
		panelRef,
		panelAnchorLeft,
		panelAnchorTop,
	);

	if (markers.length === 0) {
		return null;
	}

	return (
		<>
			{markers.map((marker) => (
				<CommentMarker
					key={marker.objectId}
					objectId={marker.objectId}
					openCount={marker.openCount}
					isActive={isPanelOpen && commentTargetId === marker.objectId}
					left={marker.left}
					top={marker.top}
					title={messages.menuComments}
				/>
			))}
			{markerPanelTarget !== undefined && markerPanelObject !== undefined && (
				<CommentMarkerPanelWrapper
					ref={panelRef}
					data-kind="menu"
					data-id="object-menu"
					data-part="panel"
					style={{
						left: panelAnchorLeft + offsetX,
						top: panelAnchorTop + offsetY,
					}}
				>
					<CommentPanel
						key={markerPanelTarget.objectId}
						objectId={markerPanelTarget.objectId}
						objectLabel={resolveCommentTargetLabel(markerPanelObject)}
						threads={markerPanelTarget.threads}
						commentAuthor={commentAuthor}
						placement="marker"
						onCommentUpdate={onCommentUpdate}
					/>
				</CommentMarkerPanelWrapper>
			)}
		</>
	);
};

export const CommentMarkerLayer = memo(CommentMarkerLayerComponent);
