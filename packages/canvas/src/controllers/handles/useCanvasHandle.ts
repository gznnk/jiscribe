import { type Dispatch, type RefObject, useMemo } from "react";

import type { CanvasHandle } from "./CanvasHandle";
import { useExportHandle } from "./useExportHandle";
import { useHistoryHandle } from "./useHistoryHandle";
import { useInteractionHandle } from "./useInteractionHandle";
import { useMeasureHandle } from "./useMeasureHandle";
import { useSelectionHandle } from "./useSelectionHandle";
import { useViewportHandle } from "./useViewportHandle";
import type { CanvasControllerState } from "../CanvasTypes";
import type { CanvasAction } from "../reducer/CanvasActions";
import type { CanvasRegistries } from "../registries";

/** Everything the handle namespaces are built from, gathered from the Canvas body. */
export type UseCanvasHandleParams = {
	/** The canvas reducer's dispatch; the writing namespaces go through it */
	dispatch: Dispatch<CanvasAction>;
	/** Current controller state; every namespace reads it at call time, not at render time */
	canvasState: CanvasControllerState;
	/** The canvas's registry bundle, fixed at mount */
	registries: CanvasRegistries;
	/** The live canvas `<svg>` (null until CanvasView mounts) */
	svgRef: RefObject<SVGSVGElement | null>;
	/**
	 * Runs a snapshot with viewport culling suspended (see useViewportCulling).
	 * Only the export namespace needs it, and it is why the whole handle is built
	 * after the culling hook rather than beside the other state-derived hooks.
	 */
	withCullingSuspended: <T>(snapshot: () => T) => T;
};

/**
 * Assembles the imperative Canvas handle from its namespaces
 * (see {@link CanvasHandle}).
 *
 * Kept beside the namespaces rather than in the Canvas component so that adding
 * one — the way `measure`, `history` and `interaction` were added — touches this
 * directory alone: the type, the builder, and this assembly. The component only
 * hands the result to `useImperativeHandle`, since the `ref` prop is its own
 * contract rather than the handle's.
 *
 * @param params - See {@link UseCanvasHandleParams}
 * @returns The handle, stable for the canvas's lifetime — every namespace is
 *   built once and reads the live state when called, so a host may hold on to
 *   `ref.current` or to a single namespace off it
 */
export const useCanvasHandle = ({
	dispatch,
	canvasState,
	registries,
	svgRef,
	withCullingSuspended,
}: UseCanvasHandleParams): CanvasHandle => {
	// The canvas stays authoritative for the live camera and selection: the host
	// reads them out and pushes changes back imperatively, with no controlled prop
	// that could fight a gesture.
	const viewport = useViewportHandle(dispatch, canvasState, registries, svgRef);
	const selection = useSelectionHandle(dispatch, canvasState);
	const exportHandle = useExportHandle(
		canvasState,
		registries,
		svgRef,
		withCullingSuspended,
	);
	// Read-only counterparts: what the canvas made of the document, and what the
	// user is doing to it. Only the history handle writes, and only through the
	// same commands the shortcuts use.
	const measure = useMeasureHandle(canvasState, registries);
	const history = useHistoryHandle(dispatch, canvasState, registries);
	const interaction = useInteractionHandle(canvasState);

	return useMemo(
		() => ({
			viewport,
			selection,
			export: exportHandle,
			measure,
			history,
			interaction,
		}),
		[viewport, selection, exportHandle, measure, history, interaction],
	);
};
