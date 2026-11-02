import type { DragKind } from "@jiscribe/canvas";

/**
 * Whether each kind of drag changes the document on release. Keyed by every
 * DragKind, so a kind the canvas adds fails typecheck here until it is placed
 */
const docEditingDragKinds: Record<DragKind, boolean> = {
	inert: false,
	pan: false,
	marquee: false,
	// A menu slider previews into the objects and commits on release
	menu: true,
	move: true,
	transform: true,
	draw: true,
	connector: true,
	stencil: true,
	vertex: true,
	label: true,
	segment: true,
	selectionControl: true,
};

/**
 * Whether a drag in progress holds an edit that only reaches the document when it
 * is let go — what is lost if the canvas takes another document first
 *
 * @param dragKind `interaction.getStatus().drag`; null (no drag) reads as false
 */
export const isDocEditingDrag = (dragKind: DragKind | null): boolean =>
	dragKind !== null && docEditingDragKinds[dragKind];
