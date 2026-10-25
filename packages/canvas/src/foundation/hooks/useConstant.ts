import { useRef } from "react";

/**
 * Returns a single value produced by `factory`, created lazily on the first
 * render and kept stable for the component's whole lifetime.
 *
 * Preferred over useMemo for stateful helpers (nonce trackers, schedulers,
 * guards): useMemo may drop and recompute its cached value, which would create
 * a second instance and lose the first one's accumulated state. A ref is never
 * discarded, so the value is constructed exactly once.
 *
 * `factory` must be a pure constructor — it runs at most once per component
 * instance and its identity is ignored on subsequent renders. A holder object
 * is used (rather than checking `ref.current === null`) so any value, including
 * null or undefined, is memoized correctly.
 */
export const useConstant = <T>(factory: () => T): T => {
	const ref = useRef<{ value: T } | null>(null);
	if (ref.current === null) {
		ref.current = { value: factory() };
	}
	return ref.current.value;
};
