// The vocabulary of canvas operations an AI tool can ask for. Transport-free:
// who carries the request (IPC, a websocket, a direct call) and who applies it
// belong to the host, and only this vocabulary is shared between them.
//
// The one distinction the vocabulary itself makes is what an operation takes to
// answer — a document, or a canvas that is mounted — because that is what decides
// where the host has to send it.

import type {
	AddObjectParams,
	AlignEdge,
	AnchorHandleId,
	ConnectParams,
	DistributeAxis,
	InlineTextStyleParams,
	ObjectFilter,
	Rect,
	SetInlineTextStyleEntry,
	SetHeightModeParams,
	SetPointsEntry,
	SetPositionEntry,
	SetTextEntry,
	StyleParams,
	UpdateConnectorEntry,
	UpdateConnectorParams,
	ZOrderPlacement,
} from "@jiscribe/doc";

/**
 * A canvas operation an AI tool can ask for, split by what it takes to answer:
 * {@link AiDocOp} needs a document and nothing else, {@link AiHandleOp} needs a
 * canvas that is actually mounted. The two take different routes through the
 * host, and the split is the same one the canvas API itself draws between
 * `docOps` and the imperative handle.
 */
export type AiCanvasOp = AiDocOp | AiHandleOp;

/**
 * An operation only a mounted canvas can serve: the rendered image, the camera,
 * the selection, and the measurements of what was actually drawn. None of them
 * touches the document, and a host that merely holds one cannot run any of them.
 */
export type AiHandleOp =
	| { kind: "captureCanvas" }
	// An empty ids clears the selection
	| { kind: "selectObjects"; ids: string[] }
	// Puts world (x, y) at the centre of the screen; omitting zoom keeps the current one
	| { kind: "centerView"; x: number; y: number; zoom?: number }
	// The camera as the host may set it whole; zoom is clamped by the tool schema
	| { kind: "setView"; minX: number; minY: number; zoom: number }
	// Reads the camera together with the world rect currently on screen
	| { kind: "getView" }
	| {
			kind: "fitView";
			/** What the canvas holds; exclusive with rect, and one of the two is required */
			target?: AiFitTarget;
			/** A region worked out by the caller; exclusive with target */
			rect?: AiRect;
	  }
	| {
			kind: "measureText";
			id: string;
			/** Which text slot; omitted measures the shape's first one */
			slot?: string;
	  }
	// Omitting ids compares every object on the canvas
	| { kind: "findOverlaps"; ids?: string[] }
	| { kind: "measureConnectorPath"; id: string }
	// The result is one rectangle: the union of what all of them draw
	| { kind: "measureVisualBounds"; ids: string[] }
	| {
			kind: "hitTest";
			/** A world point, tested against the outlines; exclusive with rect */
			point?: AiPoint;
			/** A world rect, tested against bounding boxes; exclusive with point */
			rect?: AiRect;
			/** Hit slack (world px) for line-like shapes; omitted leaves the canvas default */
			tolerance?: number;
	  }
	| { kind: "getSelection" }
	| { kind: "toSvg" }
	| { kind: "getInteractionStatus" }
	// Client coordinates, the space PointerEvent.clientX/Y is in
	| { kind: "toWorld"; x: number; y: number }
	// World coordinates, converted the other way
	| { kind: "toClient"; x: number; y: number };

/** Empty space kept outside the drawing, in world px; every side optional and 0 when omitted */
export type AiViewPadding = {
	top?: number;
	right?: number;
	bottom?: number;
	left?: number;
};

/** How the view is framed when the document is opened */
export type AiViewOpen = "fit-width" | "fit-all";

/** Whether panning is walled in at the padded content, or endless */
export type AiViewScroll = "content" | "infinite";

/** What fitView frames when it is not given a rect: the whole drawing, or the current selection */
export type AiFitTarget = "all" | "selection";

/**
 * Every {@link AiHandleOp} kind, written as a map so that a variant added to the
 * union fails to compile until it is entered here. {@link isAiDocOp} is the only
 * reader, and getting an entry wrong there silently routes an operation to a host
 * that cannot serve it.
 */
const HANDLE_OP_KINDS: Readonly<Record<AiHandleOp["kind"], true>> = {
	captureCanvas: true,
	selectObjects: true,
	centerView: true,
	setView: true,
	getView: true,
	fitView: true,
	measureText: true,
	findOverlaps: true,
	measureConnectorPath: true,
	measureVisualBounds: true,
	hitTest: true,
	getSelection: true,
	toSvg: true,
	getInteractionStatus: true,
	toWorld: true,
	toClient: true,
};

/**
 * Whether an operation can be served from a document alone, i.e. without a
 * mounted canvas. Hosts route on this: a document-only operation may be applied
 * to a file on a server, while everything else has to reach the canvas on screen.
 *
 * @param value - Any canvas operation; narrowing is by kind, so an object that
 *   was not built from this vocabulary counts as a doc op
 * @returns True for {@link AiDocOp}, false for {@link AiHandleOp}
 */
export const isAiDocOp = (value: AiCanvasOp): value is AiDocOp =>
	!Object.hasOwn(HANDLE_OP_KINDS, value.kind);

/** An operation that reads or changes the document; kept in step with docOps */
export type AiDocOp =
	| { kind: "describeCanvas" }
	| { kind: "listObjects" }
	| ({ kind: "findObjects" } & AiObjectFilter)
	| { kind: "getObject"; id: string }
	| { kind: "getObjectBounds"; id: string }
	// Omitting ids measures the whole drawing
	| { kind: "getCombinedBounds"; ids?: string[] }
	| {
			kind: "getText";
			id: string;
			/** Which text slot; omitted reads the shape's single body of text */
			slot?: string;
	  }
	| { kind: "getZOrder"; id: string }
	| { kind: "getParentGroup"; id: string }
	| { kind: "getGroupMembers"; groupId: string }
	| { kind: "getConnectors"; id: string }
	| { kind: "getConnectedObjects"; id: string }
	| { kind: "listTypes" }
	| ({ kind: "addObject"; type: string } & AiAddObjectParams)
	| {
			kind: "addObjects";
			objects: readonly AiNewObject[];
			/** Wrap everything added here in one new group. Exclusive with parentGroupId */
			groupNewObjects?: boolean;
			/** Existing group to add into; omitted adds at the front (root) */
			parentGroupId?: string;
	  }
	| {
			kind: "connect";
			/** Object the source end attaches to. Exclusive with sourcePoint */
			sourceId?: string;
			/** Object the target end attaches to. Exclusive with targetPoint */
			targetId?: string;
			/** Unattached source end at a world coordinate. Both ends cannot be bare */
			sourcePoint?: AiPoint;
			/** Unattached target end at a world coordinate. Both ends cannot be bare */
			targetPoint?: AiPoint;
			sourceAnchor?: AnchorHandleId;
			targetAnchor?: AnchorHandleId;
			startArrow?: AiArrowType;
			endArrow?: AiArrowType;
			label?: string;
			routing?: AiRouting;
			points?: AiPoint[];
	  }
	// Endpoints are resolved against the doc as it already stands, so an object added
	// in the same turn must be added before this runs
	| { kind: "connectMany"; entries: readonly AiConnectEntry[] }
	| { kind: "deleteObjects"; ids: string[] }
	| { kind: "setPosition"; id: string; x?: number; y?: number }
	| { kind: "setPositions"; entries: readonly AiSetPositionEntry[] }
	| { kind: "translateObjects"; ids: string[]; deltaX: number; deltaY: number }
	| { kind: "resizeObject"; id: string; width?: number; height?: number }
	| {
			kind: "resizeObjects";
			ids: string[];
			/** One width for every id; omitted keeps each object's own */
			width?: number;
			/** One height for every id; omitted keeps each object's own */
			height?: number;
	  }
	| {
			kind: "setHeightMode";
			ids: string[];
			/** "auto" drops the height from the document, "fixed" writes `height` back */
			mode: AiHeightMode;
			/** Height in px "fixed" writes; required by it, unread by "auto" */
			height?: number;
	  }
	| {
			kind: "setRotation";
			ids: string[];
			/** Clockwise degrees about the shape's own centre; absolute, not a step */
			rotation: number;
	  }
	| {
			kind: "setPoints";
			/** id of a polygon or polyline; no other type is accepted */
			id: string;
			/** The whole new outline in world coordinates; the shape follows its vertices */
			points: AiPoint[];
	  }
	| { kind: "setPointsMany"; entries: readonly AiSetPointsEntry[] }
	| {
			kind: "reorderObjects";
			ids: string[];
			/** Where to restack them; restacking happens inside the parent that holds each id */
			placement: AiZOrderPlacement;
	  }
	| { kind: "setStyle"; ids: string[]; style: AiStyle }
	/** The colour of the canvas surface itself; null drops it from the document, handing the surface back to the host's theme */
	| { kind: "setBackground"; color: string | null }
	/**
	 * What the document declares about presentation: the padding, how it is framed
	 * when opened, and the wall panning stops at. Only the parts given are
	 * written, and a part given as null is dropped from the declaration
	 */
	| {
			kind: "setDocumentView";
			padding?: AiViewPadding | null;
			open?: AiViewOpen | null;
			scroll?: AiViewScroll | null;
	  }
	/** Writes the properties a type holds of its own (lucideIcon's icon, callout's tail) */
	| {
			kind: "setExtraProps";
			id: string;
			extraProps: Readonly<Record<string, unknown>>;
	  }
	| { kind: "setText"; id: string; text: string; slot?: string }
	| { kind: "setTexts"; entries: readonly AiSetTextEntry[] }
	| ({ kind: "setTextStyle"; id: string } & AiInlineTextStyleParams)
	| { kind: "setTextStyles"; entries: readonly AiSetTextStyleEntry[] }
	| ({ kind: "updateConnector"; id: string } & UpdateConnectorParams)
	// An id may appear only once, each entry holding every change to that connector
	| { kind: "updateConnectors"; entries: readonly AiUpdateConnectorEntry[] }
	| { kind: "alignObjects"; ids: string[]; edge: AiAlignEdge }
	| {
			kind: "distributeObjects";
			ids: string[];
			axis: AiDistributeAxis;
			spacing?: number;
	  }
	| { kind: "groupObjects"; ids: string[] }
	| { kind: "dissolveGroup"; id: string }
	| { kind: "dissolveGroups"; ids: string[] }
	| { kind: "addToGroup"; groupId: string; ids: string[] }
	| { kind: "removeFromGroup"; ids: string[] }
	| { kind: "undo" };

/** The conditions find_objects narrows by; every one given must hold */
export type AiObjectFilter = ObjectFilter;

/** One object as add_object / add_objects takes it: place, size, text and style */
export type AiAddObjectParams = AddObjectParams;

/** One element of add_objects: the same as {@link AiAddObjectParams} plus the type name */
export type AiNewObject = { type: string } & AiAddObjectParams;

/** One element of connect_many: the endpoint pair and options connect itself takes */
export type AiConnectEntry = ConnectParams;

/** One element of set_positions: an id and the absolute top-left set_position takes */
export type AiSetPositionEntry = SetPositionEntry;

/** One element of set_points_many: an id and the whole outline set_points takes */
export type AiSetPointsEntry = SetPointsEntry;

/** One element of set_texts: an id and the text and slot set_text takes */
export type AiSetTextEntry = SetTextEntry;

/** One element of update_connectors: an id and the changes update_connector takes */
export type AiUpdateConnectorEntry = UpdateConnectorEntry;

/**
 * What set_text_style decorates and how: the characters to match, which occurrence
 * of them, the slot they sit in, and the inline typography to lay over them
 */
export type AiInlineTextStyleParams = InlineTextStyleParams;

/** One element of set_text_styles: an id and one {@link AiInlineTextStyleParams} */
export type AiSetTextStyleEntry = SetInlineTextStyleEntry;

/** Which way set_height_mode switches a height: stated by the document, or derived from the text */
export type AiHeightMode = SetHeightModeParams["mode"];

/** The text layout add_object may create a shape in; borrowed from the creation params */
export type AiTextLayout = NonNullable<AddObjectParams["textLayout"]>;

/** Arrowhead kind; canvas does not export ArrowType, so it is borrowed from ConnectParams */
export type AiArrowType = NonNullable<ConnectParams["startArrow"]>;

/** How a connector line bends; borrowed the same way */
export type AiRouting = NonNullable<ConnectParams["routing"]>;

/** A bend on a connector route; geometry's Point borrowed through canvas */
export type AiPoint = NonNullable<ConnectParams["points"]>[number];

/** A world region: top-left plus size, the same form every bounds result is read in */
export type AiRect = Rect;

/** The whole style vocabulary set_style and add_object accept */
export type AiStyle = StyleParams;

export type AiAlignEdge = AlignEdge;

export type AiDistributeAxis = DistributeAxis;

export type AiZOrderPlacement = ZOrderPlacement;

/**
 * The outcome of a canvas operation. A route that applies the operation on the
 * server without a round trip has no request id to match on, which is why this is
 * kept apart from whatever the host uses on the wire.
 */
export type AiCanvasOpOutcome = {
	/** When false, text is the error message handed back to the AI */
	ok: boolean;
	text: string;
	/**
	 * The captured canvas (PNG as base64, no data URL prefix). When present the
	 * host adds an image block to the tool result
	 */
	imagePngBase64?: string;
};

/**
 * How many characters of document JSON `describe_canvas` hands back before it is
 * cut off. Declared here rather than where the truncation happens because the
 * tool's own description states the figure: one source keeps the two in step.
 * A drawing of some 50 objects already exceeds it.
 */
export const MAX_DESCRIBE_CHARS = 20_000;

/**
 * The same budget for the summary lists `list_objects` and `find_objects` return.
 * Equal to {@link MAX_DESCRIBE_CHARS} on purpose, so neither read path costs the
 * model more than the other at worst; a summary is roughly a tenth of the object
 * it stands for, so the same budget carries an order of magnitude more objects.
 */
export const MAX_SUMMARY_CHARS = 20_000;

/**
 * The same budget again for the markup `to_svg` hands back. Rendered markup runs
 * several times the length of the document it came from — one shape becomes a
 * group of elements with its own transform, paths and text spans — so this cuts
 * in well before the drawings {@link MAX_DESCRIBE_CHARS} still fits whole. That is
 * the intended shape of the tool: the markup is worth reading in the small, and
 * capture_canvas is what a whole drawing is judged by.
 */
export const MAX_SVG_CHARS = 20_000;
