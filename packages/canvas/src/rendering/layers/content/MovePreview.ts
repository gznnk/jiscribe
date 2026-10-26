import type { Point } from "@jiscribe/geometry";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../states/objects/connector/ConnectorState";

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

/**
 * The drag-start state to draw `id` from, shifted, or null to draw its current
 * state: only an object the move translated, and only while its state is not
 * the start state itself.
 */
export const readShiftedStartState = (
	id: string | undefined,
	movePreview: MovePreview | undefined,
	objects: Record<string, ObjectState>,
): ObjectState | null => {
	if (
		id === undefined ||
		movePreview === undefined ||
		!movePreview.translatedIds.has(id)
	) {
		return null;
	}
	const startState = movePreview.startObjects[id];
	return startState !== undefined && startState !== objects[id]
		? startState
		: null;
};

/**
 * Whether a connector is drawn from its owners' start states, shifted with
 * them: both owners translated, and no stored vertices, which stay where they
 * are while the owners move (alignVertexPath bends the path to them). An
 * orthogonal route qualifies even though it is not exactly a translation: the
 * router rounds its crossover to whole units (elbowCandidates), so the shifted
 * path may sit up to 0.5 world units off the live one until the drop routes it.
 */
export const isConnectorShiftedWithOwners = (
	connectorState: ConnectorState,
	movePreview: MovePreview,
	objects: Record<string, ObjectState>,
): boolean =>
	movePreview.startObjects[connectorState.id] === connectorState &&
	connectorState.points.length === 0 &&
	readShiftedStartState(
		connectorState.source.owner?.id,
		movePreview,
		objects,
	) !== null &&
	readShiftedStartState(
		connectorState.target.owner?.id,
		movePreview,
		objects,
	) !== null;
