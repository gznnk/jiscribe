import type { Point } from "@jiscribe/geometry";

import type { ObjectState } from "../../../states/objects/base/ObjectState";

/**
 * What a move drag lets the renderer draw without re-rendering the moved
 * objects: each object the move handler translated is drawn from its drag-start
 * state, shifted by `delta` through the `translate` of its wrapper `<g>`, so its
 * component keeps the props it had and only one attribute changes per frame.
 *
 * Declared by the writer of the move (the object drag handler), never inferred
 * by the renderer: only that writer knows which states are its translation of
 * the start state and nothing else. The state itself still carries the moved
 * positions, so everything that reads it sees the truth; this is a shortcut in
 * the drawing only (see docs/08-rendering-and-theme.md).
 */
export type MovePreview = {
	/**
	 * The cumulative delta, in world units, the handler applied to every
	 * translated object this frame: the snapped and axis-locked one, exactly as
	 * handed to moveByDelta.
	 */
	readonly delta: Point;
	/**
	 * Ids whose moveByDelta returned a new state this frame. A connector's is a
	 * no-op, so connectors are never listed; one without stored vertices is drawn
	 * shifted when both of its owners are, an orthogonal route up to 0.5 world
	 * units off the live one until the drop (see ObjectsRenderer).
	 */
	readonly translatedIds: ReadonlySet<string>;
	/** The drag-start snapshot the translation was taken from, keyed by id. */
	readonly startObjects: Record<string, ObjectState>;
};
