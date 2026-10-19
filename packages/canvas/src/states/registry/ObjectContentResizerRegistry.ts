import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { TextSlotStyle } from "@jiscribe/doc/model/objects/types/text/TextSlot";

import type { ObjectState } from "../objects/base/ObjectState";

/**
 * The edge of a box a resize keeps in place along one axis, in the box's own
 * frame, flips included: `"start"` is the edge its left or top key points lie on,
 * `"end"` the opposite one, `"center"` the middle — where a proportional resize
 * from a side handle grows the axis that handle does not move.
 */
export type ResizeHeldEdge = "start" | "center" | "end";

/**
 * Which axes of a box a resize through a transform handle writes, each with the
 * edge it holds (calcResizedAxes decides them from the handle and the modifiers;
 * calcObjectResizedAxes restates them for each object a group resize scales).
 */
export type ResizedAxes = {
	/** The edge the width grows and shrinks from; absent when the resize leaves the width alone */
	readonly width?: ResizeHeldEdge;
	/** The edge the height grows and shrinks from; absent when the resize leaves the height alone */
	readonly height?: ResizeHeldEdge;
};

/**
 * What a resizer needs beyond the object's own state.
 */
export type ObjectContentResizeContext = {
	/**
	 * The resized type's own defaults for its body slot, filled in by the
	 * registration (`applyObjectDefinition`) rather than by the caller: measuring
	 * against a style other than the drawn one sizes the box a few percent wrong,
	 * which shows up as a box clipping its own last characters. Undefined for a
	 * type that declares none.
	 */
	textStyleDefaults?: TextSlotStyle;
	/**
	 * The axes a transform-handle drag is writing onto the box, in the box's own
	 * frame (also for an object a group or multi-select resize scales): present on
	 * every frame of a resize drag and on the transition that closes it (the
	 * dragEnd), absent everywhere else — load, undo/redo, external sync, text
	 * edits, commands. A resizer reads a written axis as an input only while this
	 * is present; otherwise the box is its content's answer. A box the content
	 * keeps from the written size grows from the held edge, so the side the drag
	 * left alone stays put.
	 */
	resizedAxes?: ResizedAxes;
};

/**
 * Re-derives an object's box from the content it holds, for the types whose doc
 * stores no size (`geometry: "point"`). The doc coordinate is the box's drawn
 * top-left corner, so an implementation grows the box along the object's own
 * axes — right and down before any rotation or flip — and leaves that corner,
 * and hence the doc coordinate, where it was (see GeometryType). Along an axis a
 * resize drag writes, it holds `context.resizedAxes`' edge instead.
 *
 * Implementations declare the state they accept via `TState`, which
 * `ObjectTypeDefinition` ties to the type's own state; the registry stores the
 * default instantiation.
 *
 * Callers run this on every frame of every gesture, so returning `state` itself
 * when the measurement matches the box it already has is part of the contract:
 * it is what lets them skip the rest of the pass by reference equality.
 */
export type ObjectContentResizer<TState extends ObjectState = ObjectState> = (
	state: TState,
	context: ObjectContentResizeContext,
) => TState;

/**
 * Per-type registry of content resizers. A type with no registered resizer keeps
 * the box its doc stored, which is every type but the point-geometry ones — so
 * the three derivation passes (canvasToState, reconcileObjectContentSizes,
 * graftTextEditDraft) skip it entirely.
 */
export class ObjectContentResizerRegistry {
	private readonly resizers = new Map<ObjectType, ObjectContentResizer>();

	register(type: ObjectType, resizer: ObjectContentResizer): void {
		this.resizers.set(type, resizer);
	}

	get(type: ObjectType): ObjectContentResizer | undefined {
		return this.resizers.get(type);
	}

	clear(): void {
		this.resizers.clear();
	}
}

export const createObjectContentResizerRegistry =
	(): ObjectContentResizerRegistry => new ObjectContentResizerRegistry();
