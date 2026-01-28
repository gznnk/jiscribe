import type { Point } from "@workspace/geometry";
import type React from "react";

import type { CanvasState } from "../../../states/canvas/CanvasState";

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
	| "wheel";

export type HoveredElement = {
	id: string;
	kind: string;
};

export type ScrollDelta = {
	deltaX: number;
	deltaY: number;
};

export type Gesture = {
	type: GestureType;
	target: EventTarget | null;
	targetId?: string;
	targetKind?: string;
	start: Point; // SVG coordinates
	last: Point; // SVG coordinates
	delta: Point; // SVG coordinates
	clientStart: Point; // Client (screen) coordinates
	clientLast: Point; // Client (screen) coordinates
	clientDelta: Point; // Client (screen) coordinates
	mods: Mods;
	hovered: HoveredElement[];
	time: number;
	button: number;
	scrollDelta?: ScrollDelta; // Optional scroll delta for edge scrolling
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
	canvasStateRef: React.RefObject<CanvasState>;
};
