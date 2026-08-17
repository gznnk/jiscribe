import { useMemo } from "react";

import type { ObjectType } from "../../schemas/objects/types/ObjectType";
import type {
	CanvasControllerState,
	CanvasModalKind,
	DragKind,
} from "../CanvasTypes";
import { useCanvasStateMirror } from "./useCanvasStateMirror";

/** What the user is doing to the canvas at this instant. */
export type CanvasInteractionStatus = {
	/**
	 * What the drag in progress is doing, or null when no pointer is down
	 * (see {@link DragKind}). Every drag raises it, whichever handler runs — a
	 * marquee, a connector being pulled out of an anchor, a shape being drawn,
	 * a stencil dragged off the palette are all in here, so there is no separate
	 * flag for any of them.
	 */
	drag: DragKind | null;
	/** Whether the view is still coasting from a released pan (inertial scrolling). */
	isInertialScrolling: boolean;
	/** Id of the object whose text is open in the in-place editor, or null when none is. */
	editingTextId: string | null;
	/**
	 * Object type the drawing tool is set to create, or null when the pointer
	 * tool is active. Set from the moment the tool is picked in the palette,
	 * through the drag that draws with it — `drag` is what tells the two apart
	 * (null: armed and waiting; non-null: drawing right now). Palette items are
	 * not one per type, so two of them can report the same type here.
	 *
	 * Left out of {@link isBusy} on purpose: an armed tool waits for the user
	 * indefinitely, so a host that blocked on it would never write. An external
	 * write does disarm it (resetUiState), and so does undo/redo — which costs
	 * the user a click and nothing else.
	 */
	drawingShapeType: ObjectType | null;
	/**
	 * The modal the canvas has open, or null when none is (see {@link CanvasModalKind}).
	 *
	 * Also left out of {@link isBusy}: adopting a new document deliberately keeps
	 * an open modal (SYNC_EXTERNAL preserves `activeModal`), so there is nothing
	 * for a write to destroy here.
	 */
	modal: CanvasModalKind | null;
	/**
	 * Whether an interaction is under way that an external document write would
	 * destroy: a drag of any kind, a coasting pan, or an open text editor holding
	 * uncommitted text. Adopting a new document discards all of it (SYNC_EXTERNAL
	 * resets the gesture and UI state), so a host applying edits of its own — a
	 * collaborator's, an agent's — should wait this out rather than pull the
	 * canvas out from under the user's hands.
	 *
	 * Every input is a field of its own above, so a `true` here can always be
	 * explained: it is exactly `drag !== null || isInertialScrolling ||
	 * editingTextId !== null`. What is excluded is excluded because it resolves
	 * on nobody's schedule (see {@link drawingShapeType}) or because a write
	 * cannot harm it (see {@link modal}) — so waiting on this always terminates.
	 */
	isBusy: boolean;
};

/**
 * Imperative interaction API exposed on the `interaction` namespace of the
 * Canvas handle (`ref.current.interaction`). The canvas owns the live gesture
 * state, and a host that writes to the document from elsewhere needs to know
 * whether the user is in the middle of something first.
 */
export type CanvasInteractionHandle = {
	/**
	 * Reads what the user is doing right now
	 * (see {@link CanvasInteractionStatus}).
	 *
	 * @returns A snapshot; it is not live, so read it again rather than holding on to it
	 */
	getStatus(): CanvasInteractionStatus;
};

/**
 * Reads the interaction status off a controller state
 * (see {@link CanvasInteractionStatus}).
 *
 * @param state - The controller state to read; only its transient interaction
 *   fields are touched, never the document
 * @returns The status, derived fresh on every call
 */
export const resolveInteractionStatus = (
	state: Pick<
		CanvasControllerState,
		| "activeDragKind"
		| "inertialScrolling"
		| "textEditState"
		| "shapeDrawing"
		| "activeModal"
	>,
): CanvasInteractionStatus => ({
	drag: state.activeDragKind,
	isInertialScrolling: state.inertialScrolling,
	editingTextId: state.textEditState?.objectId ?? null,
	drawingShapeType: state.shapeDrawing?.preset.objectType ?? null,
	modal: state.activeModal,
	// The transient states of the individual drags (a pending connector, a
	// marquee, a stencil dragged off the palette) are not read here:
	// handleGesture raises activeDragKind on every dragStart and clears it on
	// every dragEnd, so a drag of any kind is already this.
	isBusy:
		state.activeDragKind !== null ||
		state.inertialScrolling ||
		state.textEditState !== null,
});

/**
 * Builds the stable interaction sub-handle assembled into the Canvas handle.
 *
 * @param canvasState - Current controller state, read at call time (not at
 *   render time) so the handle stays referentially stable
 */
export const useInteractionHandle = (
	canvasState: CanvasControllerState,
): CanvasInteractionHandle => {
	const canvasStateRef = useCanvasStateMirror(canvasState);

	return useMemo(
		() => ({
			getStatus: () => resolveInteractionStatus(canvasStateRef.current),
		}),
		[canvasStateRef],
	);
};
