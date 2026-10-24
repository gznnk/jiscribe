import { useRef } from "react";

import type { CanvasControllerState } from "../CanvasTypes";

/**
 * `useMemo` over the state's `objects` plus `deps`, except that a change of
 * `objects` alone is ignored while a move drag is under way: a move writes
 * nothing but placement, so a value built from what the selection is (its
 * types, styles, sections) stays right for the whole drag. Only "move" holds
 * the value — a transform drag writes size and rotation, which the rows report.
 *
 * Whatever `build` reads off `objects` has to be placement-independent; the
 * rows that report placement read the state directly, not through this.
 *
 * @param canvasState - The state the value is built for; its `objects` and `drag.kind` decide whether the held value still stands
 * @param build - Builds the value; called during render, only when it is not held
 * @param deps - Everything else `build` reads, compared entry by entry with `Object.is` whether or not a drag is under way
 * @returns The value built last time while it still stands, a freshly built one otherwise
 */
export const useMemoAcrossMoveDrag = <T>(
	canvasState: CanvasControllerState,
	build: () => T,
	deps: readonly unknown[],
): T => {
	const heldRef = useRef<{
		objects: CanvasControllerState["objects"];
		deps: readonly unknown[];
		value: T;
	} | null>(null);
	const { objects } = canvasState;
	const isMoveDrag = canvasState.drag?.kind === "move";
	const held = heldRef.current;
	if (
		held !== null &&
		(isMoveDrag || Object.is(held.objects, objects)) &&
		held.deps.length === deps.length &&
		held.deps.every((dep, index) => Object.is(dep, deps[index]))
	) {
		return held.value;
	}
	const value = build();
	heldRef.current = { objects, deps, value };
	return value;
};
