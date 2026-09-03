import type { CanvasControllerState } from "../../CanvasTypes";

const freezeRecursively = (value: unknown, seen: WeakSet<object>): void => {
	if (value === null || typeof value !== "object") {
		return;
	}
	if (seen.has(value)) {
		return;
	}
	seen.add(value);
	// Object.freeze cannot stop Map/Set set/add, so they are skipped — which also excludes
	// the deliberately mutable cache structures.
	if (value instanceof Map || value instanceof Set) {
		return;
	}
	Object.freeze(value);
	for (const child of Object.values(value)) {
		freezeRecursively(child, seen);
	}
};

/**
 * Recursively Object.freeze a state for tests.
 *
 * Handlers and commands are required to update state immutably, and handleGesture's change
 * detection (what increments commitVersion) is a reference comparison resting on that rule.
 * An in-place mutation goes undetected and causes phantom history (#19), so freezing the
 * state handed to a test turns a violation into an immediate strict-mode TypeError.
 *
 * Everything under `history` is left unfrozen: resolveDocSnapshot updates DocSnapshot in
 * place on purpose, as write-once memoization (see the invariant on DocSnapshot in CanvasTypes.ts).
 */
export const deepFreezeState = (
	state: CanvasControllerState,
): CanvasControllerState => {
	const seen = new WeakSet<object>();
	Object.freeze(state);
	for (const [key, child] of Object.entries(state)) {
		if (key === "history") {
			continue;
		}
		freezeRecursively(child, seen);
	}
	return state;
};
