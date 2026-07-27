import type { Point } from "@workspace/geometry";
import type React from "react";

import type { CanvasControllerState } from "../../CanvasTypes";

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
	| "wheel";

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
};

export type Gesture = {
	type: GestureType;
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
	zoomDelta?: number; // Optional zoom delta (deltaY from wheel event, zoom events only)
	scrollDelta?: ScrollDelta; // Optional scroll delta for edge scrolling
	inputValue?: string; // Optional input value from native-pointer elements (data-gesture="native-pointer")
};

export type GestureCallback = (gesture: Gesture) => void;

export type PointerEventHandlers = {
	onPointerDown: React.PointerEventHandler<HTMLElement>;
	onPointerMove: React.PointerEventHandler<HTMLElement>;
	onPointerUp: React.PointerEventHandler<HTMLElement>;
	onPointerCancel: React.PointerEventHandler<HTMLElement>;
};

export type GestureRecognizerConfig = {
	gestureCallback: GestureCallback;
	containerRef: React.RefObject<HTMLElement | null>;
	svgRef: React.RefObject<SVGSVGElement | null>;
	canvasStateRef: React.RefObject<CanvasControllerState>;
};
