import type { BoundingBox, FrameKeyPoints, Point } from "@workspace/geometry";

import type { ConnectorLabelPlacement } from "../presentations/layers/content/utils/label/calcConnectorLabelPlacement";
import type { DocCreationDefaults } from "../schemas/objects/types/DocCreationDefaults";
import type { CanvasState } from "../states/canvas/CanvasState";
import type { DocSnapshot } from "../states/canvas/DocSnapshot";
import type { Viewport } from "../states/canvas/Viewport";
import type { ClipboardData } from "./commands/selection/ClipboardData";
import type { Stencil } from "./ui/objects/Stencil";
import type { ObjectState } from "../states/objects/base/ObjectState";
import type { ConnectorState } from "../states/objects/connections/connector/ConnectorState";
import type { GroupState } from "../states/objects/primitives/group/GroupState";

// ---------------------------------------------------------------------------
// History coalescing types (stored in CanvasControllerState)
// ---------------------------------------------------------------------------

/**
 * Coalescing state for merging consecutive operations into a single undo entry.
 * The history layer owns `recorded`; each event handler owns `pending` (separated by role).
 */
export type HistoryCoalesce = {
	/**
	 * Coalesce identifier of the previous commit (key and commit time).
	 * Written only by recordHistoryIfNeeded; read-only from handlers.
	 * null is a coalesce boundary (the next commit always becomes a new entry).
	 */
	recorded: { key: string; time: number } | null;
	/**
	 * Coalesce key (intent) that each handler sets only when it wants to coalesce.
	 * Consumed by recordHistoryIfNeeded on commit and always reset to null.
	 * The key encodes what counts as a continuation of the same operation (e.g. "move:<selectedId>").
	 */
	pending: string | null;
};

// ---------------------------------------------------------------------------
// KeyPoints cache types (stored in CanvasControllerState)
// ---------------------------------------------------------------------------

export type KeyPointsCacheEntry = {
	stateRef: ObjectState;
	keyPoints: FrameKeyPoints;
};

/** Cache of object ID → keyPoints. Held in CanvasControllerState and updated in handleGesture. */
export type KeyPointsCache = Record<string, KeyPointsCacheEntry>;

// ---------------------------------------------------------------------------
// Snap types (controller-layer only)
// ---------------------------------------------------------------------------

export type SnapEdge =
	| "left"
	| "right"
	| "top"
	| "bottom"
	| "hCenter"
	| "vCenter";

/**
 * A snap candidate point.
 * x candidates: left/right edges + hCenter (center X coordinate). `coordinate` is the X coordinate; perpendicularMin/Max are that object's top/bottom.
 * y candidates: top/bottom edges + vCenter (center Y coordinate). `coordinate` is the Y coordinate; perpendicularMin/Max are that object's left/right.
 */
export type SnapCandidate = {
	objectId: string;
	coordinate: number;
	edge: SnapEdge;
	/** Perpendicular range of the guide line (start) */
	perpendicularMin: number;
	/** Perpendicular range of the guide line (end) */
	perpendicularMax: number;
};

export type SnapCandidates = {
	/** left/right edge candidates (sorted ascending by coordinate) */
	x: SnapCandidate[];
	/** top/bottom edge candidates (sorted ascending by coordinate) */
	y: SnapCandidate[];
};

export type SnapAxisFeedback = {
	/** Snap coordinate (position of the guide line) */
	coordinate: number;
	/** Perpendicular start of the guide line (x-snap: Y coordinate, y-snap: X coordinate) */
	lineStart: number;
	/** Perpendicular end of the guide line */
	lineEnd: number;
	sourceObjectIds: string[];
};

export type SnapFeedback = {
	/** X-axis snaps (vertical guide lines). Multiple when left/right each match a candidate */
	x: SnapAxisFeedback[];
	/** Y-axis snaps (horizontal guide lines). Multiple when top/bottom each match a candidate */
	y: SnapAxisFeedback[];
};

/**
 * Axis-lock feedback for Shift dragging.
 * Represents guide lines spanning the whole viewport (like SnapFeedback, x=vertical / y=horizontal).
 * Normally only one of the two. During origin snapping both are set to display a crosshair.
 */
export type AxisLockFeedback = {
	/** X coordinate of the vertical guide line (SVG coordinates). Set on X lock (vertical move) or origin snap */
	x?: number;
	/** Y coordinate of the horizontal guide line (SVG coordinates). Set on Y lock (horizontal move) or origin snap */
	y?: number;
};

/**
 * State of the history stack.
 * Entries are lazy DocSnapshots: the Doc tree is materialized only when an
 * entry is actually read (undo/redo restore, save notification, external-sync
 * comparison), not on every commit.
 */
export type HistoryState = {
	/** Past states (undo stack) */
	past: DocSnapshot[];
	/** Current state */
	present: DocSnapshot;
	/** Future states (redo stack) */
	future: DocSnapshot[];
};

/**
 * Snapshot at gesture start (dragStart).
 * dragStart cache for deriving multi-select resize bounds without re-collecting
 * every leaf vertex per frame (#215). Built by TransformControlHandler.
 */
export type MultiSelectResizeBoundsCache = {
	/**
	 * Combined extents of affine-exact leaf points (polys and axis-aligned frames)
	 * in the start group's rotation-aligned local space, as offsets from the start
	 * group center. null when the selection has no such points.
	 */
	affineLocalExtents: {
		minX: number;
		maxX: number;
		minY: number;
		maxY: number;
	} | null;
	/**
	 * Leaf object IDs whose world points must be re-collected every frame because
	 * their transform is not an exact affine map of the group resize
	 * (connectors and obliquely rotated frames).
	 */
	nonAffineLeafIds: string[];
};

/**
 * A dedicated type that pre-computes and caches the data needed for calculations during a drag.
 * Created on dragStart and cleared to null on dragEnd.
 */
export type EventStartSnapshot = {
	/** Object map at drag start */
	objects: Record<string, ObjectState>;
	/** Slice of object ID → FrameKeyPoints (also includes multiSelectGroup.id) */
	keyPoints: Record<string, FrameKeyPoints>;
	/**
	 * Flat "object ID → root-level bounding box" map derived from keyPoints once at dragStart.
	 * Groups hold the union of their children; connectors and objects without a valid extent are absent.
	 * Consumed by the marquee hot path (collectIdsInArea / createMultiSelectGroup) so it never
	 * recomputes bboxes per drag frame.
	 */
	bboxes: Record<string, BoundingBox>;
	/** Snap candidates (pre-computed at dragStart for all objects. Exclusions are passed to findSnap as a Set) */
	snapCandidates: SnapCandidates;
	/** List of selected IDs at drag start */
	selectedIds: string[];
	/**
	 * ID set of the selected objects plus all their descendants (pre-computed at dragStart).
	 * Passed to findSnap / buildSnapFeedback as the snap exclusion set.
	 */
	selectedIdsWithDescendants: ReadonlySet<string>;
	/** Multi-selection group (null when there is no multi-selection) */
	multiSelectGroup: GroupState | null;
	/** Viewport at drag start (reference point for grab scrolling) */
	viewport: Viewport;
	/** Multi-select resize bounds cache (#215). Set by TransformControlHandler on dragStart of a resize anchor */
	multiSelectResizeBoundsCache?: MultiSelectResizeBoundsCache | null;
};

/**
 * Canvas state extended with history management for the controller layer.
 * This combines the pure canvas state with undo/redo history.
 *
 * Pure state only: the per-canvas registry bundle is NOT stored here. It is a
 * dependency (not data), so it is passed to the pure reducer/handler/command tree
 * as an explicit `registries` argument instead (#165).
 */
export type CanvasControllerState = CanvasState & {
	history: HistoryState;

	/**
	 * Currently selected object IDs.
	 */
	selectedIds: string[];

	/**
	 * Snapshot of canvas state at the start of a gesture (dragStart).
	 * Pre-computed data (keyPoints, snap candidates, etc.) is stored here
	 * and cleared on dragEnd. null when no gesture is in progress.
	 */
	eventStartSnapshot: EventStartSnapshot | null;

	/**
	 * Persistent cache of keyPoints. On each dragStart, only the diff is recomputed via reference comparison.
	 * Not included in CanvasDoc and not subject to history management.
	 */
	keyPointsCache: KeyPointsCache;

	/**
	 * Cache of snapCandidates. Recomputed only on a dragStart where keyPointsCache changed.
	 * null means not yet computed (it will always be computed on the next dragStart).
	 */
	snapCandidatesCache: SnapCandidates | null;

	/**
	 * Whether edge scrolling is enabled when dragging near canvas edges.
	 */
	edgeScrollEnabled: boolean;

	/**
	 * Incremented when a new edit is confirmed (dragEnd, command execution, etc.).
	 * Internal signal used exclusively by recordHistoryIfNeeded to trigger history recording.
	 */
	commitVersion: number;

	/**
	 * Incremented when a file save is required.
	 * Set by recordHistoryIfNeeded (on normal commits) and Undo/Redo.
	 * Monitored by the single useEffect in Canvas.tsx.
	 */
	saveVersion: number;

	/**
	 * UUID generated each time saveVersion increments.
	 * Passed to onCommit and echoed back by the host; the self-save nonce tracker
	 * matches the echo to identify fold-back saves (see useSyncExternalDoc).
	 */
	saveNonce: string;

	/**
	 * State used to coalesce history entries (merging consecutive nudges, e.g. arrow-key moves, into a single undo).
	 * A transient internal signal not included in CanvasDoc.
	 */
	historyCoalesce: HistoryCoalesce;

	/**
	 * Context menu position (client coordinates).
	 * Null when no context menu should be displayed.
	 */
	contextMenuPosition: { clientX: number; clientY: number } | null;

	/**
	 * In-progress drag state from the StencilLibrary.
	 * Set on dragStart and cleared to null after adding the shape on dragEnd.
	 * While non-null it means a drag is in progress.
	 */
	stencilLibraryDrag: {
		/** Stencil being dragged */
		preset: Stencil;
		/** Ghost display position (SVG coordinates, snapped) */
		ghostPosition: Point;
		/** Half size of the ghost shape (cached at dragStart) */
		objectDimensions: { halfWidth: number; halfHeight: number };
	} | null;

	/**
	 * State while in drawing mode.
	 * Set when the Rect/Ellipse button in the StencilLibrary is clicked, and
	 * cleared to null on drawing completion, Escape, or a canvas click.
	 * - null: drawing mode OFF
	 * - preview is null: drawing mode ON (drag not started)
	 * - preview is non-null: dragging (preview displayed)
	 */
	shapeDrawing: {
		/** Stencil being drawn */
		preset: Stencil;
		/** Preview rectangle during the drag (SVG coordinates). null before the drag starts */
		preview: {
			startX: number;
			startY: number;
			endX: number;
			endY: number;
		} | null;
	} | null;

	/**
	 * The area-selection rectangle in progress (SVG coordinates).
	 * Set on a left-drag over the canvas and cleared to null on dragEnd / Escape.
	 */
	areaSelection: {
		startX: number;
		startY: number;
		endX: number;
		endY: number;
		/**
		 * The previous frame's marquee hit set. When the current frame's hits are
		 * identical, group folding and multiSelectGroup rebuilding are skipped (#219).
		 */
		hitIds: string[];
	} | null;

	/**
	 * ID of the section currently expanded within the ObjectMenu.
	 * null means all sections are collapsed.
	 */
	objectMenuOpenId: string | null;

	/**
	 * ID of the StencilLibrary category whose flyout is open in the toolbar.
	 * null means no flyout is open. Only one is open at a time. Cleared alongside
	 * objectMenuOpenId by the selection/press handlers and commands (and
	 * resetUiState), and by Escape — there is no central clear in handleGesture.
	 */
	stencilLibraryOpenCategory: string | null;

	/**
	 * The group state when multi-selected objects are grouped.
	 * When multiSelectGroup is non-null, all objects in selectedIds are treated as children of this group.
	 * Used to manage the grouped selection state.
	 * null when not grouped.
	 */
	multiSelectGroup: GroupState | null;

	/**
	 * State while editing text. The variant tells which kind of text is being
	 * edited: a shape's body text or a connector's label.
	 * null when not editing text.
	 */
	textEditState:
		| { kind: "shape"; objectId: string; text: string }
		| {
				kind: "connectorLabel";
				objectId: string;
				text: string;
				/**
				 * Placement the label being created takes on commit, projected from the
				 * double-clicked point on the line. Set only when creating (empty label
				 * text); a committed label is re-edited in place and keeps its own
				 * placement. When present it wins over any placement left on an emptied
				 * label — nothing is written to the connector until the edit is
				 * committed, so cancelling leaves no trace.
				 */
				placement?: ConnectorLabelPlacement;
		  }
		| null;

	/**
	 * Temporary state while creating a connector.
	 * Set while dragging from a connection-anchor and committed or discarded on dragEnd.
	 */
	pendingConnector: ConnectorState | null;

	/**
	 * ID of the currently selected connector.
	 * Managed independently from selectedIds (shapes only), guaranteeing mutual exclusion.
	 * null when no connector is selected.
	 */
	selectedConnectorId: string | null;

	/**
	 * The currently selected vertex.
	 * Only valid when exactly one polyline/polygon is selected.
	 * null when no vertex is selected.
	 */
	selectedVertex: {
		objectId: string;
		vertexIndex: number;
	} | null;

	/**
	 * ID of the connector being edited.
	 * Set when dragging to edit an endpoint, used together with pendingConnector.
	 * null on new creation; the original connector ID on edit.
	 * Cleared to null on dragEnd.
	 */
	editingConnectorId: string | null;

	/**
	 * The endpoint of pendingConnector currently being edited (dragged).
	 * On new creation, "target" (source is fixed, target moves).
	 * On edit, "source" or "target" (the handle side being dragged).
	 * This lets the UI layer show an anchor only on the fixed side's object.
	 * Cleared to null on dragEnd.
	 */
	editingEndpoint: "source" | "target" | null;

	/**
	 * Snap feedback during a drag.
	 * non-null only while snapping. Cleared on dragEnd.
	 */
	snapFeedback: SnapFeedback | null;

	/**
	 * Axis-lock feedback from Shift dragging.
	 * non-null only while axis-locked. Cleared on dragEnd.
	 * AxisLockGuide draws guide lines spanning the whole viewport.
	 */
	axisLockFeedback: AxisLockFeedback | null;

	/**
	 * Theme-derived defaults for newly created objects (e.g. fontFamily).
	 * Injected from the Canvas `theme` prop and kept in sync via
	 * SET_DOC_DEFAULTS; gesture handlers read it when creating docs.
	 */
	docDefaults: DocCreationDefaults;

	/**
	 * Internal clipboard.
	 * Set synchronously when CopyCommand runs, regardless of whether the write to
	 * navigator.clipboard succeeds. A fallback that guarantees paste works even when
	 * navigator.clipboard is unavailable after a Cut.
	 */
	internalClipboard: ClipboardData | null;

	/**
	 * Record of the previous Duplicate operation. Used for move-aware offset calculation.
	 * - newIds: new object IDs created by the duplicate
	 * - cx/cy: selection center coordinates immediately after creation
	 * - offset: the offset used by that duplicate
	 * On the next Duplicate, if selectedIds == newIds, compute the delta:
	 * if unmoved, reuse offset; if moved, adopt the delta as the new offset.
	 */
	lastDuplicate: {
		newIds: string[];
		cx: number;
		cy: number;
		offset: { x: number; y: number };
	} | null;
};
