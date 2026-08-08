import type { Point } from "@workspace/geometry";
import type React from "react";

import type { Viewport } from "../../../states/canvas/Viewport";

export type Mods = {
	shift: boolean;
	alt: boolean;
	ctrl: boolean;
	meta: boolean;
};

export type GestureType =
	| "pressed"
	| "dragStart"
	| "drag"
	| "dragEnd"
	| "click"
	| "doubleClick"
	| "wheel"
	| "pinch"
	// Touch only: a press held for LONG_PRESS_DURATION_MS within the drag slop.
	// Ends the gesture — the pointerup that follows fires nothing (no click).
	| "longPress";

export type HoveredElement = {
	id: string;
	kind: string;
	part?: string;
};

export type ScrollDelta = {
	deltaX: number;
	deltaY: number;
};

/**
 * Snapshot of the most recent click, used as the reference for doubleClick detection.
 * GestureRecognizer retains it on each single click and compares it against the next click.
 * clientPos is used for distance comparison and is held in client (screen) coordinates
 * to make it zoom-independent.
 */
export type ClickSnapshot = {
	time: number;
	clientPos: Point;
	// "mouse" | "pen" | "touch"; from the press that produced the click. Selects
	// the double-click distance threshold (touch gets the wider one).
	pointerType?: string;
};

export type Gesture = {
	type: GestureType;
	// "mouse" | "pen" | "touch"; fixed at pointerdown. Absent on wheel gestures.
	// Consumers branch on it where an operation's meaning differs by input device
	// (e.g. a touch canvas drag pans instead of area-selecting).
	pointerType?: string;
	target: EventTarget | null;
	targetId?: string;
	targetKind?: string;
	targetPart?: string; // Sub-area of the target ([data-part]), e.g. "label" for a connector's label box
	start: Point; // SVG coordinates
	last: Point; // SVG coordinates
	delta: Point; // SVG coordinates
	clientStart: Point; // Client (screen) coordinates
	clientLast: Point; // Client (screen) coordinates
	clientDelta: Point; // Client (screen) coordinates
	mods: Mods;
	// Lazy + memoized hover state. document.elementsFromPoint forces a layout flush,
	// and during drags only connection-anchor handling reads it, so the hit test runs
	// only when a handler actually calls this (at most once per gesture event) (#123).
	getHovered: () => HoveredElement[];
	time: number;
	button: number;
	zoomScale?: number; // Optional multiplicative zoom factor (wheel: fixed step from the deltaY sign; pinch: distance ratio since the last pinch event)
	scrollDelta?: ScrollDelta; // Optional scroll delta in screen px (wheel, edge scrolling, pinch pan)
	inputValue?: string; // Optional input value from native-pointer elements (data-gesture="native-pointer")
};

export type GestureCallback = (gesture: Gesture) => void;

export type PointerEventHandlers = {
	onPointerDown: React.PointerEventHandler<HTMLElement>;
	onPointerMove: React.PointerEventHandler<HTMLElement>;
	onPointerUp: React.PointerEventHandler<HTMLElement>;
	onPointerCancel: React.PointerEventHandler<HTMLElement>;
};

/**
 * The slice of canvas state the recognizer reads. Narrower than the controller
 * state on purpose: the full state is structurally assignable to this, so callers
 * pass their existing ref unchanged.
 */
export type RecognizerCanvasState = {
	/** Current pan/zoom; supplies the rect for edge-proximity detection and the zoom that divides screen-px scroll deltas into SVG units. */
	viewport: Viewport;
	/** Whether a drag near the container edge auto-scrolls the viewport; false makes the drag stop at the edge. */
	edgeScrollEnabled: boolean;
};

export type GestureRecognizerConfig = {
	gestureCallback: GestureCallback;
	containerRef: React.RefObject<HTMLElement | null>;
	svgRef: React.RefObject<SVGSVGElement | null>;
	/** Latest canvas state, read at gesture time. The recognizer touches only viewport and edgeScrollEnabled. */
	canvasStateRef: React.RefObject<RecognizerCanvasState>;
	/**
	 * Policy consulted when a second touch arrives during a confirmed drag:
	 * return true to close the drag with dragEnd and convert it into a pinch
	 * (viewport pans), false to keep ignoring the extra touch (object drags,
	 * shape drawing — #25). Consulted only after dragStart; pinch entry before a
	 * drag confirms is unconditional. Omitted = never convert mid-drag. Keeps
	 * the consumer's routing knowledge ("which drags are pans") out of the
	 * recognizer (the canvas injects handlers/canvas/utils/isViewportPanDrag).
	 * Any state the decision needs is closed over by the injecting side.
	 *
	 * @param targetKind - The drag's target kind fixed at pointerdown.
	 */
	shouldPinchFromDrag?: (targetKind: string | undefined) => boolean;
};
