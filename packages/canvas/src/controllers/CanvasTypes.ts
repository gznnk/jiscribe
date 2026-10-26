import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type { ViewDoc } from "@jiscribe/doc/model/canvas/ViewDoc";
import type { RichText } from "@jiscribe/doc/model/objects/types/text/RichText";
import type {
	BoundingBox,
	FrameKeyPoints,
	Point,
	Transform,
} from "@jiscribe/geometry";

import type { MovePreview } from "../rendering/layers/content/MovePreview";
import type { ConnectorLabelPlacement } from "../rendering/objects/connector/geometry/label/calcConnectorLabelPlacement";
import type { Viewport } from "../rendering/Viewport";
import type { CanvasState } from "../states/canvas/CanvasState";
import type { ClipboardData } from "./commands/selection/ClipboardData";
import type { CanvasSelection } from "./selection/CanvasSelection";
import type { Stencil } from "./ui/objects/Stencil";
import type { ObjectState } from "../states/objects/base/ObjectState";
import type { ConnectorState } from "../states/objects/connector/ConnectorState";
import type { GroupState } from "../states/objects/primitives/group/GroupState";
import type { ResizedAxes } from "../states/registry/ObjectContentResizerRegistry";

// ---------------------------------------------------------------------------
// Save request types (stored in CanvasControllerState)
// ---------------------------------------------------------------------------

/**
 * A standing request for the host to save, as a version counter paired with the
 * nonce identifying that particular request.
 */
export type SaveRequest = {
	/** Incremented when a file save is required; watched by the single useEffect in Canvas.tsx */
	version: number;
	/**
	 * Regenerated on every `version` increment. Passed to onCommit and echoed back by the
	 * host, so the nonce tracker can identify fold-back saves (see useSyncExternalDoc).
	 * Empty string before the first save request.
	 */
	nonce: string;
};

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
// Connector draft types (stored in CanvasControllerState)
// ---------------------------------------------------------------------------

/**
 * The connector a drag from a connection anchor is working on. The two modes are
 * exclusive and differ in where the connector lives: creation holds it here until
 * dragEnd commits it into `objects`, while a re-anchor rewrites the existing entity
 * in `objects` on every frame (like vertex editing) and only names it here.
 *
 * Creation always drags the target end, so only `"edit"` carries the side.
 */
export type ConnectorDraft =
	| {
			kind: "create";
			/** The connector being drawn; absent from `objects` and `rootIds` until dragEnd */
			connector: ConnectorState;
	  }
	| {
			kind: "edit";
			/** ID of the connector in `objects` whose endpoint the drag rewrites */
			connectorId: string;
			/**
			 * The end the drag moves; the other keeps its start-time anchor. Lets the UI
			 * show receiving anchors only on the fixed side.
			 */
			endpoint: "source" | "target";
	  };

// ---------------------------------------------------------------------------
// Snap types (controller-layer only)
// ---------------------------------------------------------------------------

export type SnapEdge =
	| "left"
	| "right"
	| "top"
	| "bottom"
	| "hCenter"
	| "vCenter"
	/** A single polyline / polygon vertex; its perpendicular range is that point */
	| "vertex";

/**
 * A snap candidate point.
 *
 * For an x candidate (left/right/hCenter/vertex) `coordinate` is the X coordinate and
 * perpendicularMin/Max are the object's top/bottom (a vertex's own Y for "vertex");
 * for a y candidate they swap.
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
	/** left/right/hCenter/vertex candidates, sorted ascending by coordinate */
	x: SnapCandidate[];
	/** top/bottom/vCenter/vertex candidates, sorted ascending by coordinate */
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
 * The slice of CanvasState a history entry holds: what undo / redo restore,
 * and what its CanvasDoc is built from. Holding these references is safe
 * because every state update path replaces objects immutably; the committed
 * map can never change under the snapshot.
 */
export type DocSnapshotSource = Pick<
	CanvasState,
	"objects" | "rootIds" | "meta" | "background" | "view" | "opaqueObjects"
>;

/**
 * A history entry: the committed state it restores, plus its CanvasDoc as a
 * cache held by the present entry only.
 *
 * Undo / redo restore `source` as is, so every object the swap does not
 * change keeps its identity and the per-object caches downstream (memoized
 * renders, connector routes, text layout) still hold. Rebuilding the Doc tree
 * (`canvasToDoc`) is O(N) over all objects, so `doc` is only built when
 * something reads the present entry as a Doc (`resolveDocSnapshot`: the save,
 * the external-sync comparison), and an entry leaving `present` is replaced by
 * one without it (`dropDocCache`) so past and future hold state only.
 *
 * Invariants: neither ObjectState contents nor a resolved Doc may ever be
 * mutated in place — mappers share inner arrays (e.g. Poly `points`) by
 * reference between the two representations, and restoring hands `source`
 * back to the live state. `source` is also the entry's identity: dropping the
 * cache yields a new object around the same `source`, so whatever pins an
 * entry (a history mark) pins its `source`.
 */
export type DocSnapshot = {
	/** The committed state the entry restores; shared with that state, never copied. */
	readonly source: DocSnapshotSource;
	/**
	 * `readTextMeasurementGeneration()` when the entry was created. A restore
	 * under a later generation re-measures the content-sized boxes of `source`,
	 * which were measured against the faces loaded back then.
	 */
	readonly textMeasurementGeneration: number;
	/**
	 * The document the entry was adopted from, held verbatim for the entry's
	 * whole life, so undoing back to it saves the host's own bytes rather than
	 * their normalized rebuild. Set on the entries the host's doc created (the
	 * initial one, SYNC_EXTERNAL, LOAD_DOCUMENT); null on every committed one.
	 */
	readonly openedDoc: CanvasDoc | null;
	/** The Doc of `source`, memoized on first resolve; null until then, on every past or future entry, and while `openedDoc` answers instead. */
	doc: CanvasDoc | null;
};

/**
 * State of the history stack (see {@link DocSnapshot}). `source` of the
 * present entry is the state last committed or restored, not necessarily the
 * live one: a pass that is no commit (a re-measure after fonts load) moves the
 * live objects on without touching it.
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
 * What a dragStart carries over from the last one rather than recomputing.
 *
 * Pure speed-up, kept outside the snapshot because it outlives any single drag:
 * dropping either half costs the next dragStart a recomputation, never
 * correctness, which is why resetUiState may clear them wholesale.
 */
export type DragStartCaches = {
	/**
	 * Persistent across gestures; each dragStart recomputes only the objects that
	 * changed, found by reference comparison against `stateRef`.
	 */
	keyPoints: KeyPointsCache;
	/**
	 * Recomputed only on a dragStart where `keyPoints` changed. null means not yet
	 * computed, so the next dragStart always computes it.
	 */
	snapCandidates: SnapCandidates | null;
};

/**
 * Data pre-computed for the duration of a drag. Created on dragStart and cleared on dragEnd.
 */
export type DragStartSnapshot = {
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
	selectedIds: readonly string[];
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
 * A rectangle a drag spans, in SVG coordinates: where it started and where the
 * pointer is now. Not normalized — `end` may lie left of or above `start`.
 */
export type DragRect = {
	startX: number;
	startY: number;
	endX: number;
	endY: number;
};

/**
 * What a drag is doing, with whatever only that kind of drag holds. What each
 * kind means is written once, on {@link DragKind}. handleGesture opens every
 * drag as `"inert"`; the handler the drag reaches names it in its own dragStart
 * ({@link claimDrag}).
 */
export type CanvasDragDetail =
	| { kind: "inert" }
	| { kind: "pan" }
	| { kind: "menu" }
	| {
			kind: "move";
			/**
			 * What the object drag handler translated this frame, set on every frame.
			 * It goes when the drag does, so the frame that commits the drop is drawn
			 * from the state alone.
			 */
			movePreview?: MovePreview;
	  }
	| {
			kind: "transform";
			/**
			 * What a resize writes. Absent on the rotation knob, so its presence alone
			 * says a handle is resizing.
			 */
			resize?: TransformDragResize;
	  }
	| {
			kind: "marquee";
			rect: DragRect;
			/**
			 * Previous frame's marquee hit set. An identical hit set this frame skips
			 * group folding and multiSelectGroup rebuilding (#219).
			 */
			hitIds: string[];
			/**
			 * Selection the marquee started from, kept only when an additive modifier
			 * was held at dragStart; every frame selects these plus the current hit
			 * set. Empty for a plain marquee, which replaces the selection.
			 */
			baseIds: readonly string[];
	  }
	| {
			kind: "draw";
			/** The bounds the shape takes, `end` already snapped */
			rect: DragRect;
	  }
	| { kind: "connector"; draft: ConnectorDraft }
	| {
			kind: "stencil";
			preset: Stencil;
			/** SVG coordinates, snapped */
			ghostPosition: Point;
			/** Cached at dragStart */
			objectDimensions: { halfWidth: number; halfHeight: number };
	  }
	| { kind: "vertex" }
	| { kind: "label" }
	| { kind: "segment" }
	| { kind: "selectionControl" };

/**
 * What a drag is doing, as `interaction.getStatus().drag` reports it and as
 * `drag.kind` holds it:
 * - `"inert"`: no handler took the drag up; it holds the pointer until release and changes nothing
 * - `"pan"`: moving the view (middle or right button, or one finger on the background)
 * - `"menu"`: working a control of a menu or sidebar, such as an ObjectMenu slider; leaves an open text edit open
 * - `"move"`: moving objects — a shape, a group or a multi-selection
 * - `"transform"`: resizing or rotating through a transform handle
 * - `"marquee"`: area selection over the background
 * - `"draw"`: drawing the shape `mode` is armed with; `mode` stays `"draw"` until dragEnd
 * - `"connector"`: pulling a connector out of a connection anchor, or re-anchoring one end
 * - `"stencil"`: dragging a preset off the StencilLibrary; the shape is added on dragEnd
 * - `"vertex"`: moving or inserting a vertex of a polyline, polygon or connector
 * - `"label"`: moving a connector's label along its line
 * - `"segment"`: moving or sliding a connector segment
 * - `"selectionControl"`: working a control a type contributes for its own selection (selectionControls)
 */
export type DragKind = CanvasDragDetail["kind"];

/**
 * The drag in progress. handleGesture owns the lifecycle — one is opened on every
 * dragStart and dropped on every dragEnd — so a non-null `drag` is exactly "a
 * drag is under way" no matter which handler runs, and everything here goes with
 * it.
 *
 * Not in the type: a drag on canvas content (any kind but `"inert"`, `"pan"` and
 * `"menu"`) never coexists with `mode.kind === "textEdit"`. The handlers that
 * take canvas content commit the edit first, at dragStart into `startSnapshot`
 * as well; which handlers, and at which event, is listed on
 * commitTextEditIntoDragSnapshot.
 */
export type CanvasDrag = CanvasDragDetail & {
	/** Data frozen at dragStart, and the reference the whole drag is measured from */
	startSnapshot: DragStartSnapshot;
	/** Non-null only while snapping. Drawn by SnapGuides */
	snapFeedback: SnapFeedback | null;
	/** Non-null only while axis-locked. Drawn by AxisLockGuide */
	axisLockFeedback: AxisLockFeedback | null;
	/** Whether dragging near a canvas edge scrolls the viewport; false until a handler claims the drag for content */
	edgeScrollEnabled: boolean;
};

/**
 * The open text-editing session's draft. What is being edited is `selection`,
 * not named here (see {@link CanvasMode}).
 */
export type TextEditDraft =
	| {
			kind: "shape";
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
			 * whole slot (readOpenTextEditForStyle). Collapsed (start === end) for
			 * a plain caret, and absent until the editor has reported once.
			 */
			selection?: { start: number; end: number };
	  }
	| {
			kind: "connectorLabel";
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
	  };

/**
 * What the canvas is in the middle of across drags: one of these at a time,
 * so a text edit and an armed drawing tool cannot both be up.
 *
 * `"textEdit"` holds the open session's draft. Read it through readOpenTextEdit,
 * which pairs the draft with its owner again. Three invariants every writer
 * keeps:
 * - `selection.objectIds` holds exactly one id, the owner's
 * - a `"shape"` draft means that object holds text and `selection.part` is one
 *   collapsed textSlot range naming the slot being edited, whatever the type's
 *   text shape (a one-body type's slot is its `body`); nothing else there, no
 *   pick or a pick of another kind included, keeps the session alive
 * - a `"connectorLabel"` draft means that one id is a connector, with
 *   `selection.part` null
 *
 * And one duty: a writer that moves `selection.objectIds` while a session is
 * open runs commitTextEditIfNeeded first (SET_SELECTION, the press handlers).
 * The reducer's reconcileSelection only catches an owner that is gone or
 * cannot hold the session; a draft left over a move to another text-holding
 * object is indistinguishable from one started there, and commits into it.
 *
 * `"draw"` is the drawing tool armed from the StencilLibrary; the drag that
 * draws with it is the `"draw"` drag, the same activity's second phase. It outlasts
 * pans, wheel, pinch, context menus and menu drags, and is left on, e.g., a
 * draw's dragEnd, a canvas click, Escape, or a text edit opening, which
 * replaces it.
 */
export type CanvasMode =
	| { kind: "normal" }
	| { kind: "textEdit"; draft: TextEditDraft }
	| { kind: "draw"; preset: Stencil };

/**
 * A transform-handle resize, stated in the frame whose handle is dragged; each
 * object the drag scales reads it in its own frame (calcObjectResizedAxes).
 */
export type TransformDragResize = {
	/** The axes the handle writes and the edges it holds, in `frame`'s terms */
	readonly axes: ResizedAxes;
	/** Rotation (degrees) and flips of the dragged frame at dragStart: the selected object's own, or the multi-select group's */
	readonly frame: Transform;
};

/**
 * The host-controllable part of the viewport (pan + zoom). Width/height are
 * excluded: they are container-measured, not host-set.
 */
export type Camera = Pick<Viewport, "minX" | "minY" | "zoom">;

/**
 * How far the canvas may be scrolled, set once at mount through
 * `initialConfig.scrollBounds`.
 *
 * Passing this answers for the whole surface: it outranks the loaded document's
 * own `view.scroll` declaration, and the document's `view.padding` plays no part
 * in the wall it puts up. Omit it to let each document decide (see
 * `resolveScrollWallPadding`).
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
 * What a stencil panel shows, the flyout over the canvas and the docked panel
 * alike: the presets of one library category, or the catalog of every category
 * (the search across all of them, and the list to pin from).
 */
export type StencilPanelContent =
	| {
			kind: "category";
			/**
			 * Id of a section of `stencilLibrary.sections`. One the library does not
			 * hold (a plugin the host no longer applies) is drawn as the catalog.
			 */
			categoryId: string;
	  }
	| { kind: "catalog" };

/** State of the docked stencil panel; see CanvasControllerState.stencilLibraryPanel. */
export type StencilLibraryPanelState = {
	/**
	 * Whether the panel is docked beside the viewport. Set by the dock button of
	 * the flyout, cleared by the panel's own undock and close buttons and by the
	 * `toggleStencilLibrary` command while it shows the catalog.
	 */
	isOpen: boolean;
	/**
	 * What the panel shows. Kept while the panel is closed, so the next dock
	 * restores it until the flyout replaces it.
	 */
	content: StencilPanelContent;
};

/** State of the properties sidebar; see CanvasControllerState.propertyPanel. */
export type PropertyPanelState = {
	/** Whether the panel is open. Toggled by the toolbar button and the panel's own close button. */
	isOpen: boolean;
	/**
	 * Ids of the collapsed sections; every section not listed is expanded, so the
	 * empty array is "all open". Survives closing and reopening the panel.
	 */
	collapsedSectionIds: string[];
};

/** Ids of the panels a sidebar can show. */
export type SidebarPanelId = keyof CanvasSidebarsState["panels"];

/**
 * One edge of the canvas. Today each shows a single panel: `"stencilLibrary"`
 * (the docked stencil panel) on the left, `"properties"` on the right.
 */
export type SidebarSideState = {
	/**
	 * Whether that edge is showing its panel. Defaults to false. On the left it
	 * means the stencil panel is docked; the flyout over the canvas is never
	 * reported.
	 */
	isOpen: boolean;
};

/** State the properties panel keeps across being shown and hidden. */
export type SidebarPanelState = {
	/**
	 * Ids of the collapsed sections; every section not listed is expanded, so the
	 * empty array (the default) is "all open".
	 */
	collapsedSectionIds: string[];
};

/** State the docked stencil panel keeps across being shown and hidden. */
export type StencilLibrarySidebarState = {
	/** What the panel shows when it is docked (see {@link StencilPanelContent}). */
	content: StencilPanelContent;
};

/**
 * Both sidebars, as the canvas reports them and a host persists them (see
 * `CanvasConfig.sidebars`).
 */
export type CanvasSidebarsState = {
	/** The left edge, which shows the `"stencilLibrary"` panel when it is docked. */
	left: SidebarSideState;
	/** The right edge, which shows the `"properties"` panel. */
	right: SidebarSideState;
	/** Every panel's own state, held whether or not its edge is open. */
	panels: {
		/** The docked stencil panel: what it shows. */
		stencilLibrary: StencilLibrarySidebarState;
		/** The properties panel: which of its sections are collapsed. */
		properties: SidebarPanelState;
	};
};

/**
 * What a host restores through `CanvasConfig.sidebars`: every key optional, a
 * missing one takes the default.
 */
export type CanvasInitialSidebars = {
	/** The left edge; omitted, it starts closed. */
	left?: SidebarSideState;
	/** The right edge; omitted, it starts closed. */
	right?: SidebarSideState;
	/** Panel state by id; a panel left out starts in its default state. */
	panels?: {
		/**
		 * The docked stencil panel. Omitted, or stored without `content` (a value
		 * saved before the panel had one), it shows the catalog.
		 */
		stencilLibrary?: Partial<StencilLibrarySidebarState>;
		/** The properties panel; omitted, every section starts expanded. */
		properties?: SidebarPanelState;
	};
};

/**
 * Canvas state extended with undo/redo history for the controller layer.
 *
 * Pure state only: the per-canvas registry bundle is a dependency rather than data, so it is
 * passed to the reducer/handler/command tree as an explicit `registries` argument (#165).
 */
export type CanvasControllerState = CanvasState & {
	/**
	 * Where the canvas is looked at from: width/height as useContainerResize
	 * measures the container, pan/zoom as the host and the view gestures move it.
	 */
	viewport: Viewport;

	history: HistoryState;

	/**
	 * What the canvas is pointed at: the objects picked, and the parts picked one
	 * level below them (see {@link CanvasSelection}).
	 */
	selection: CanvasSelection;

	/** What the canvas is in the middle of across drags (see {@link CanvasMode}) */
	mode: CanvasMode;

	/** The drag in progress, null when no pointer drag is under way (see {@link CanvasDrag}) */
	drag: CanvasDrag | null;

	/**
	 * Whether the view is still coasting from a released pan (inertial scrolling).
	 * Deliberately not folded into `drag`: no pointer is down and no drag is
	 * open, so the two would stop being set as a pair. handleGesture owns the
	 * lifecycle — up on every fling frame, down on the recognizer's
	 * inertialScrollEnd.
	 */
	inertialScrolling: boolean;

	/**
	 * What the next dragStart reuses instead of recomputing. Not part of CanvasDoc
	 * and not subject to history management.
	 */
	dragStartCaches: DragStartCaches;

	/**
	 * How far the view may be scrolled, applied by `limitViewScroll` at the end of
	 * every gesture (nothing else limits the view). Always present: only the host
	 * half is fixed at mount, while the document half moves with whatever document
	 * is loaded, so there is no point at which "no wall" can be settled for good.
	 */
	scrollLimit: {
		/**
		 * The host's mount-time setting, or null when it left the wall to the
		 * document. Kept because the wall is re-resolved from it on every scroll.
		 */
		hostConfig: ScrollBoundsConfig | null;
		/**
		 * The rect the view is kept inside, measured from `measuredFrom` /
		 * `measuredView`; null when nothing walls the view in — no wall was
		 * declared, or the doc holds no content to bound it to.
		 */
		rect: BoundingBox | null;
		/**
		 * The object map `rect` was measured from — a different reference means it
		 * is stale. Measuring walks every object, so it is redone lazily, on the
		 * first scroll after the objects change rather than on the change itself.
		 * null before the first measurement, which is what makes the first scroll
		 * measure no matter what the other cache key says.
		 */
		measuredFrom: Record<string, ObjectState> | null;
		/**
		 * The `view` `rect` was measured under, the second half of the cache key:
		 * loading another document moves the wall even when its padding happens to
		 * match, and `undefined` is a value here (a doc declaring no view) rather
		 * than a "not measured" marker — `measuredFrom` carries that.
		 */
		measuredView: ViewDoc | undefined;
	};

	/**
	 * Advanced by the writer that confirms an edit of the document (commitEdit).
	 * Internal signal read exclusively by recordHistoryIfNeeded.
	 */
	commitVersion: number;

	/**
	 * Standing request for the host to save. Both halves are written as a pair, by
	 * recordHistoryIfNeeded on normal commits and by Undo/Redo.
	 */
	saveRequest: SaveRequest;

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

	/** null means all ObjectMenu sections are collapsed */
	objectMenuOpenId: string | null;

	/**
	 * The stencil panel open over the canvas (the flyout), null when none is. One
	 * at a time, and never beside the docked panel: while that is open, what the
	 * flyout would show goes there instead. Cleared alongside objectMenuOpenId by
	 * the selection/press handlers, commands and resetUiState, and by Escape —
	 * there is no central clear in handleGesture.
	 */
	stencilFlyout: StencilPanelContent | null;

	/**
	 * The docked stencil panel (StencilPanel beside the viewport). Editor
	 * chrome rather than part of the document: canvas presses, Escape, selection
	 * changes and a doc swap (resetUiState / restoreHistorySnapshot) all leave it
	 * as it is. Written only by the `toggleStencilLibrary` command,
	 * StencilCategoryToggleHandler and StencilLibraryPanelHandler (see
	 * toggleStencilPanelContent).
	 */
	stencilLibraryPanel: StencilLibraryPanelState;

	/**
	 * Ids of the library categories pinned to the rail, in rail order. Chrome on
	 * the same terms as the panels. Ids naming no section of the library stay
	 * here — a host without that plugin must not erase the user's pin — and are
	 * only left off the rail. Written only by StencilLibraryPanelHandler (the
	 * catalog's pin buttons).
	 */
	pinnedCategoryIds: string[];

	/**
	 * Ids of the sections the host's `stencilLibrary.sections` resolved to, in
	 * order (sections left empty dropped). Not the user's: Canvas seeds it at
	 * mount and keeps it in step with the prop (SET_STENCIL_LIBRARY), so the
	 * reducer can tell what a panel draws (readDrawnStencilPanelContent) the way
	 * the render does. Chrome like the panels: kept across a doc swap and history
	 * navigation.
	 */
	stencilLibraryCategoryIds: string[];

	/**
	 * The properties sidebar (PropertyPanel), on the opposite edge from the shape
	 * library. Editor chrome on the same terms: canvas presses, Escape, selection
	 * changes and a doc swap (resetUiState / restoreHistorySnapshot) all leave it
	 * as it is. Written only by the `togglePropertyPanel` command.
	 */
	propertyPanel: PropertyPanelState;

	/**
	 * Group state covering a multi-selection: while non-null every object in selection.objectIds is
	 * treated as its child. null when the selection is not grouped.
	 */
	multiSelectGroup: GroupState | null;

	/**
	 * Set synchronously by CopyCommand regardless of whether the navigator.clipboard write
	 * succeeds, so paste still works when navigator.clipboard is unavailable after a Cut.
	 */
	internalClipboard: ClipboardData | null;

	/**
	 * Previous Duplicate or Paste (both write it), for move-aware offset calculation: on the
	 * next Duplicate or Paste, if the selection still equals newIds, an unmoved selection reuses
	 * `offset` and a moved one adopts the delta as the new offset.
	 */
	lastDuplicate: {
		newIds: string[];
		/** Selection center X immediately after the duplicate/paste */
		cx: number;
		/** Selection center Y immediately after the duplicate/paste */
		cy: number;
		/** The step to repeat, not necessarily the delta applied: a paste that had to
		 * re-center on the view records the plain offset so the walk restarts there */
		offset: { x: number; y: number };
	} | null;
};
