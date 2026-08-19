import type { BoundingBox, FrameKeyPoints, Point } from "@jiscribe/geometry";

import type { ConnectorLabelPlacement } from "../presentations/layers/content/utils/label/calcConnectorLabelPlacement";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import type { DocCreationDefaults } from "../schemas/objects/types/DocCreationDefaults";
import type { RichText } from "../schemas/objects/types/RichText";
import type { CanvasState } from "../states/canvas/CanvasState";
import type { Viewport } from "../states/canvas/Viewport";
import type { ClipboardData } from "./commands/selection/ClipboardData";
import type { Stencil } from "./ui/objects/Stencil";
import type { ObjectState } from "../states/objects/base/ObjectState";
import type { ConnectorState } from "../states/objects/connector/ConnectorState";
import type { GroupState } from "../states/objects/primitives/group/GroupState";

// ---------------------------------------------------------------------------
// History coalescing types (stored in CanvasControllerState)
// ---------------------------------------------------------------------------

/**
 * Coalescing state for merging consecutive operations into a single undo entry.
 * The history layer owns `recorded`; each event handler owns `pending`.
 */
export type HistoryCoalesce = {
	/**
	 * Coalesce identifier of the previous commit. Written only by recordHistoryIfNeeded;
	 * read-only from handlers. null is a coalesce boundary.
	 */
	recorded: { key: string; time: number } | null;
	/**
	 * Coalesce key a handler sets when it wants the next commit merged into the previous
	 * entry; it encodes what counts as the same operation (e.g. `"move:<selectedId>"`).
	 * Consumed and reset to null by recordHistoryIfNeeded on commit.
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

/** Object ID → keyPoints. Held in CanvasControllerState and updated in handleGesture. */
export type KeyPointsCache = Record<string, KeyPointsCacheEntry>;

// ---------------------------------------------------------------------------
// Snap types (controller-layer only)
// ---------------------------------------------------------------------------

export type SnapEdge =
	"left" | "right" | "top" | "bottom" | "hCenter" | "vCenter";

/**
 * A snap candidate point.
 *
 * For an x candidate (left/right/hCenter) `coordinate` is the X coordinate and
 * perpendicularMin/Max are the object's top/bottom; for a y candidate they swap.
 */
export type SnapCandidate = {
	objectId: string;
	coordinate: number;
	edge: SnapEdge;
	/** Perpendicular start of the guide line */
	perpendicularMin: number;
	/** Perpendicular end of the guide line */
	perpendicularMax: number;
};

export type SnapCandidates = {
	/** left/right/hCenter candidates, sorted ascending by coordinate */
	x: SnapCandidate[];
	/** top/bottom/vCenter candidates, sorted ascending by coordinate */
	y: SnapCandidate[];
};

export type SnapAxisFeedback = {
	/** Position of the guide line along the snapped axis */
	coordinate: number;
	/** Perpendicular start of the guide line (Y for an x-snap, X for a y-snap) */
	lineStart: number;
	/** Perpendicular end of the guide line */
	lineEnd: number;
	sourceObjectIds: string[];
};

export type SnapFeedback = {
	/** Vertical guide lines; more than one when left and right each match a candidate */
	x: SnapAxisFeedback[];
	/** Horizontal guide lines; more than one when top and bottom each match a candidate */
	y: SnapAxisFeedback[];
};

/**
 * Axis-lock feedback for Shift dragging, as guide lines spanning the whole viewport.
 * Normally only one of the two is set; origin snapping sets both to draw a crosshair.
 */
export type AxisLockFeedback = {
	/** X coordinate of the vertical guide line (SVG coordinates) */
	x?: number;
	/** Y coordinate of the horizontal guide line (SVG coordinates) */
	y?: number;
};

/**
 * The slice of CanvasState a snapshot needs to rebuild its CanvasDoc later.
 * Holding these references is safe because every state update path replaces
 * objects immutably; the committed map can never change under the snapshot.
 */
export type DocSnapshotSource = Pick<
	CanvasState,
	"objects" | "rootIds" | "background"
>;

/**
 * A history entry whose CanvasDoc is materialized lazily.
 *
 * Rebuilding the Doc tree (`canvasToDoc`) is O(N) over all objects, which is
 * too expensive to run on every commit during key-repeat nudges. Instead the
 * history stack stores either an already-resolved Doc or a reference to the
 * committed state, and `resolveDocSnapshot` converts on first read only.
 *
 * Invariant: neither ObjectState contents nor a resolved Doc may ever be
 * mutated in place — mappers share inner arrays (e.g. Poly `points`) by
 * reference between the two representations.
 */
export type DocSnapshot = {
	/** Resolved Doc (memoized). null until first resolution. */
	doc: CanvasDoc | null;
	/** Committed-state references for lazy conversion. null once resolved (or when created from a Doc). */
	source: DocSnapshotSource | null;
};

/**
 * State of the history stack. Entries are lazy DocSnapshots: the Doc tree is materialized
 * only when an entry is read (undo/redo restore, save notification, external-sync comparison).
 */
export type HistoryState = {
	past: DocSnapshot[];
	present: DocSnapshot;
	future: DocSnapshot[];
};

/**
 * dragStart cache for deriving multi-select resize bounds without re-collecting every leaf
 * vertex per frame (#215). Built by TransformControlHandler.
 */
export type MultiSelectResizeBoundsCache = {
	/**
	 * Combined extents of affine-exact leaf points (polys and axis-aligned frames) in the start
	 * group's rotation-aligned local space, as offsets from the start group center.
	 * null when the selection has no such points.
	 */
	affineLocalExtents: {
		minX: number;
		maxX: number;
		minY: number;
		maxY: number;
	} | null;
	/**
	 * Leaf objects whose world points must be re-collected every frame because their transform
	 * is not an exact affine map of the group resize (connectors and obliquely rotated frames).
	 */
	nonAffineLeafIds: string[];
};

/**
 * Data pre-computed for the duration of a drag. Created on dragStart and cleared on dragEnd.
 */
export type EventStartSnapshot = {
	objects: Record<string, ObjectState>;
	/** Slice of object ID → FrameKeyPoints; also includes multiSelectGroup.id */
	keyPoints: Record<string, FrameKeyPoints>;
	/**
	 * Object ID → root-level bounding box, derived from keyPoints once at dragStart so the
	 * marquee hot path never recomputes bboxes per frame. Groups hold the union of their
	 * children; connectors and objects without a valid extent are absent.
	 */
	bboxes: Record<string, BoundingBox>;
	/** Candidates over all objects; exclusions are passed to findSnap separately */
	snapCandidates: SnapCandidates;
	selectedIds: string[];
	/** Selected objects plus all descendants; the exclusion set for findSnap / buildSnapFeedback */
	selectedIdsWithDescendants: ReadonlySet<string>;
	/** null when there is no multi-selection */
	multiSelectGroup: GroupState | null;
	/** Reference point for grab scrolling */
	viewport: Viewport;
	/** Set by TransformControlHandler on dragStart of a resize anchor (#215) */
	multiSelectResizeBoundsCache?: MultiSelectResizeBoundsCache | null;
};

/** Modal surfaces the canvas owns. Only one can be open at a time. */
export type CanvasModalKind = "export" | "shortcutHelp";

/**
 * What an in-progress drag is doing. Only the distinctions the UI gates on are named;
 * a handler that does not name its drag leaves it at the "other" every drag starts from.
 */
export type DragKind =
	/** Moving objects: a shape, a group, or a multi-selection */
	| "move"
	/** Resizing or rotating through a transform handle */
	| "transform"
	/** Everything else: connectors, vertices, connection anchors, marquee, pan, menus */
	| "other";

/**
 * How far the canvas may be scrolled, set once at mount through
 * `initialConfig.scrollBounds`.
 *
 * The limit applies to the deliberate view scrolls only — the wheel and the grab
 * pan. Zooming stays unrestricted (zooming out past the range still shows the
 * empty area around it), and so does every other way the view moves; a view left
 * outside the range that way scrolls back at its own pace rather than snapping.
 */
export type ScrollBoundsConfig = {
	/**
	 * `"infinite"` (the default when the whole setting is omitted) leaves the
	 * canvas unbounded; `"content"` limits panning to the extent of the objects
	 * currently in the doc, so an empty doc is unbounded either way.
	 */
	mode: "infinite" | "content";
	/**
	 * Margin in world units kept outside the content extent (default `100`, four
	 * cells of the default grid). Ignored when `mode` is `"infinite"`. `0` puts
	 * the wall exactly on the outermost object's edge, which leaves that object
	 * flush against the window edge.
	 */
	padding?: number;
};

/**
 * Canvas state extended with undo/redo history for the controller layer.
 *
 * Pure state only: the per-canvas registry bundle is a dependency rather than data, so it is
 * passed to the reducer/handler/command tree as an explicit `registries` argument (#165).
 */
export type CanvasControllerState = CanvasState & {
	history: HistoryState;

	selectedIds: string[];

	/** null when no gesture is in progress */
	eventStartSnapshot: EventStartSnapshot | null;

	/**
	 * Kind of the drag in progress; null when none is. handleGesture owns the lifecycle —
	 * "other" on every dragStart, null on every dragEnd — so `!== null` is exactly "a drag
	 * is under way" no matter which handler runs. Handlers own the meaning: one that wants
	 * its drag distinguished overwrites the kind in its own dragStart.
	 */
	activeDragKind: DragKind | null;

	/**
	 * Whether the view is still coasting from a released pan (inertial scrolling).
	 * Deliberately not folded into activeDragKind: no pointer is down and no
	 * eventStartSnapshot is open, so the two would stop being set as a pair.
	 * handleGesture owns the lifecycle — up on every fling frame, down on the
	 * recognizer's inertialScrollEnd.
	 */
	inertialScrolling: boolean;

	/**
	 * Persistent across gestures; each dragStart recomputes only the diff by reference
	 * comparison. Not part of CanvasDoc and not subject to history management.
	 */
	keyPointsCache: KeyPointsCache;

	/**
	 * Recomputed only on a dragStart where keyPointsCache changed.
	 * null means not yet computed, so the next dragStart always computes it.
	 */
	snapCandidatesCache: SnapCandidates | null;

	/** Whether dragging near a canvas edge scrolls the viewport */
	edgeScrollEnabled: boolean;

	/**
	 * How far the view may be scrolled, or null on the default infinite canvas.
	 * Set once at mount and applied by `limitViewScroll` at the end of every
	 * gesture (nothing else limits the view).
	 */
	scrollLimit: {
		/** The host's setting, kept because the rect is re-measured from it */
		config: ScrollBoundsConfig;
		/**
		 * The rect the view is kept inside, measured from `measuredFrom`; null when
		 * the doc holds no content to bound it to.
		 */
		rect: BoundingBox | null;
		/**
		 * The object map `rect` was measured from — a different reference means it
		 * is stale. Measuring walks every object, so it is redone lazily, on the
		 * first scroll after the objects change rather than on the change itself.
		 * null before the first measurement.
		 */
		measuredFrom: Record<string, ObjectState> | null;
	} | null;

	/**
	 * Incremented when a new edit is confirmed (dragEnd, command execution, etc.).
	 * Internal signal read exclusively by recordHistoryIfNeeded.
	 */
	commitVersion: number;

	/**
	 * Incremented when a file save is required. Set by recordHistoryIfNeeded on normal commits
	 * and by Undo/Redo; watched by the single useEffect in Canvas.tsx.
	 */
	saveVersion: number;

	/**
	 * Regenerated on every saveVersion increment. Passed to onCommit and echoed back by the
	 * host, so the nonce tracker can identify fold-back saves (see useSyncExternalDoc).
	 */
	saveNonce: string;

	/** Transient signal for merging consecutive nudges into one undo; not part of CanvasDoc */
	historyCoalesce: HistoryCoalesce;

	/** Client coordinates; null when no context menu should be displayed */
	contextMenuPosition: { clientX: number; clientY: number } | null;

	/**
	 * Modal currently open; null when none is. Deliberately left out of UiStateReset:
	 * undo/redo and external sync must not close an open modal (the behaviour the
	 * component-local open state had).
	 */
	activeModal: CanvasModalKind | null;

	/**
	 * In-progress drag from the StencilLibrary. Non-null means a drag is under way; cleared
	 * after the shape is added on dragEnd.
	 */
	stencilLibraryDrag: {
		preset: Stencil;
		/** SVG coordinates, snapped */
		ghostPosition: Point;
		/** Cached at dragStart */
		objectDimensions: { halfWidth: number; halfHeight: number };
	} | null;

	/**
	 * Drawing mode, entered from the StencilLibrary and left on completion, Escape, or a
	 * canvas click. null is off; non-null with `preview` null is armed but not yet dragging.
	 */
	shapeDrawing: {
		preset: Stencil;
		/** SVG coordinates; null before the drag starts */
		preview: {
			startX: number;
			startY: number;
			endX: number;
			endY: number;
		} | null;
	} | null;

	/**
	 * Area-selection rectangle in SVG coordinates. Set on a left-drag over the canvas and
	 * cleared on dragEnd / Escape.
	 */
	areaSelection: {
		startX: number;
		startY: number;
		endX: number;
		endY: number;
		/**
		 * Previous frame's marquee hit set. An identical hit set this frame skips group
		 * folding and multiSelectGroup rebuilding (#219).
		 */
		hitIds: string[];
	} | null;

	/** null means all ObjectMenu sections are collapsed */
	objectMenuOpenId: string | null;

	/**
	 * StencilLibrary category whose toolbar flyout is open; only one at a time, null when
	 * none. Cleared alongside objectMenuOpenId by the selection/press handlers, commands and
	 * resetUiState, and by Escape — there is no central clear in handleGesture.
	 */
	stencilLibraryOpenCategory: string | null;

	/**
	 * Group state covering a multi-selection: while non-null every object in selectedIds is
	 * treated as its child. null when the selection is not grouped.
	 */
	multiSelectGroup: GroupState | null;

	/** null when not editing text */
	textEditState:
		| {
				kind: "shape";
				objectId: string;
				/** Key of the object's `state.text` */
				slotId: string;
				/**
				 * The draft body, styling included; a slot holding rows is joined with
				 * "\n" while editing. Every keystroke advances it with the same
				 * carry-over the editor predicts with (remapRichText), and the editor is
				 * handed this value back, so what it draws, what the draft holds and
				 * what the commit writes never diverge.
				 */
				text: RichText;
				/**
				 * What the editor currently has selected, in UTF-16 offsets of `text`.
				 * Reported by the editor on every caret and selection change, and read
				 * by the styling that applies to a stretch of the text rather than to the
				 * whole slot (toggleTextEditFormat). Collapsed (start === end) for a
				 * plain caret, and absent until the editor has reported once.
				 */
				selection?: { start: number; end: number };
		  }
		| {
				kind: "connectorLabel";
				objectId: string;
				text: string;
				/**
				 * Placement the label being created takes on commit: the double-clicked point
				 * projected onto the line, or the midpoint when creation started from the Enter
				 * shortcut, which has no pointer position. Set only while creating, so a
				 * re-edited label keeps its own placement; when present it wins over any
				 * placement left on an emptied label. Nothing reaches the connector until the
				 * edit is committed, so cancelling leaves no trace.
				 */
				placement?: ConnectorLabelPlacement;
		  }
		| null;

	/** Set while dragging from a connection anchor; committed or discarded on dragEnd */
	pendingConnector: ConnectorState | null;

	/** Managed independently from selectedIds (shapes only), guaranteeing mutual exclusion */
	selectedConnectorId: string | null;

	/** Only valid when exactly one polyline/polygon is selected */
	selectedVertex: {
		objectId: string;
		vertexIndex: number;
	} | null;

	/**
	 * Text slot addressed one level below the object selection. Only valid while that
	 * object is the sole selection and still holds the slot; a stale value is neutralized
	 * on read (resolveSelectedTextSlot) instead of being cleared at every selection write.
	 */
	selectedTextSlot: {
		objectId: string;
		slotId: string;
	} | null;

	/**
	 * Connector being edited, used together with pendingConnector: null on new creation, the
	 * original connector ID on edit. Cleared on dragEnd.
	 */
	editingConnectorId: string | null;

	/**
	 * Which end of pendingConnector is being dragged — always "target" on new creation, the
	 * dragged handle's side on edit. Lets the UI show an anchor only on the fixed side.
	 * Cleared on dragEnd.
	 */
	editingEndpoint: "source" | "target" | null;

	/** Non-null only while snapping; cleared on dragEnd */
	snapFeedback: SnapFeedback | null;

	/** Non-null only while axis-locked; cleared on dragEnd. Drawn by AxisLockGuide */
	axisLockFeedback: AxisLockFeedback | null;

	/**
	 * Defaults for newly created objects (e.g. fontFamily), injected from the Canvas `theme`
	 * prop and kept in sync via SET_DOC_DEFAULTS. Read by gesture handlers creating docs.
	 */
	docDefaults: DocCreationDefaults;

	/**
	 * Set synchronously by CopyCommand regardless of whether the navigator.clipboard write
	 * succeeds, so paste still works when navigator.clipboard is unavailable after a Cut.
	 */
	internalClipboard: ClipboardData | null;

	/**
	 * Previous Duplicate, for move-aware offset calculation: on the next Duplicate, if
	 * selectedIds still equals newIds, an unmoved selection reuses `offset` and a moved one
	 * adopts the delta as the new offset.
	 */
	lastDuplicate: {
		newIds: string[];
		/** Selection center X immediately after the duplicate */
		cx: number;
		/** Selection center Y immediately after the duplicate */
		cy: number;
		offset: { x: number; y: number };
	} | null;
};
