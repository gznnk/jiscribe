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
	StyleParams,
	UpdateConnectorParams,
	ZOrderPlacement,
} from "@jiscribe/canvas/doc";

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
	| { kind: "fitView"; target: AiFitTarget }
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
	| { kind: "measureVisualBounds"; ids: string[] };

/** What fitView frames: the whole drawing, or the current selection */
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
	fitView: true,
	measureText: true,
	findOverlaps: true,
	measureConnectorPath: true,
	measureVisualBounds: true,
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
	| { kind: "deleteObjects"; ids: string[] }
	| { kind: "setPosition"; id: string; x?: number; y?: number }
	| { kind: "translateObjects"; ids: string[]; deltaX: number; deltaY: number }
	| { kind: "resizeObject"; id: string; width?: number; height?: number }
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
	| {
			kind: "reorderObjects";
			ids: string[];
			/** Where to restack them; restacking happens inside the parent that holds each id */
			placement: AiZOrderPlacement;
	  }
	| { kind: "setStyle"; ids: string[]; style: AiStyle }
	| { kind: "setText"; id: string; text: string; slot?: string }
	| ({ kind: "updateConnector"; id: string } & UpdateConnectorParams)
	| { kind: "alignObjects"; ids: string[]; edge: AiAlignEdge }
	| {
			kind: "distributeObjects";
			ids: string[];
			axis: AiDistributeAxis;
			spacing?: number;
	  }
	| { kind: "groupObjects"; ids: string[] }
	| { kind: "dissolveGroup"; id: string }
	| { kind: "addToGroup"; groupId: string; ids: string[] }
	| { kind: "removeFromGroup"; ids: string[] }
	| { kind: "undo" };

/** One object as add_object / add_objects takes it: place, size, text and style */
export type AiAddObjectParams = AddObjectParams;

/** One element of add_objects: the same as {@link AiAddObjectParams} plus the type name */
export type AiNewObject = { type: string } & AiAddObjectParams;

/** Arrowhead kind; canvas does not export ArrowType, so it is borrowed from ConnectParams */
export type AiArrowType = NonNullable<ConnectParams["startArrow"]>;

/** How a connector line bends; borrowed the same way */
export type AiRouting = NonNullable<ConnectParams["routing"]>;

/** A bend on a connector route; geometry's Point borrowed through canvas */
export type AiPoint = NonNullable<ConnectParams["points"]>[number];

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
