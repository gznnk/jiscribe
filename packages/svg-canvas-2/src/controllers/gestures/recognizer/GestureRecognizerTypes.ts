import type { Point } from "@workspace/geometry";
import type React from "react";

import type { Viewport } from "../../../states/canvas/Viewport";

export type Mods = {
	shift: boolean;
	alt: boolean;
	ctrl: boolean;
	meta: boolean;
};

export type Pressed = {
	pointerId: number;
	start: Point; // SVG coordinates
	last: Point; // SVG coordinates
	clientStart: Point; // Client coordinates
	clientLast: Point; // Client coordinates
	time: number;
	target: EventTarget | null;
	targetId?: string;
	targetKind?: string;
	mods: Mods;
	dragging: boolean;
	button: number;
};

export type GestureType =
	| "pressed"
	| "dragStart"
	| "drag"
	| "dragEnd"
	| "click";

export type HoveredElement = {
	id: string;
	kind: string;
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
	viewportRef: React.RefObject<Viewport>;
};
