import { createContext, useContext } from "react";

/**
 * Rendering-layer context carrying the counter `useFontsLoadedNonce` produces:
 * a value that changes whenever the faces the document can draw with do.
 *
 * Only its identity matters — nothing reads the number. A component that
 * measures text while it renders (a shape's `draw`, a label box, the hit bands
 * of a text object) subscribes so that a font landing after the first paint
 * pierces the memo it would otherwise be held behind; the state-derived boxes
 * are covered by the `REMEASURE_TEXT` dispatch instead (docs/08-rendering-and-theme.md).
 *
 * The default 0 never moves, which is the right reading for a tree with no
 * Provider (tests, exports): the first measurement is final.
 */
export const FontsLoadedNonceContext = createContext<number>(0);

/**
 * Subscribes to the surrounding `<Canvas>` / `<CanvasThumbnail>` fonts-loaded counter, so a
 * memoized component re-renders when a face arrives.
 *
 * Distinct from `useFontsLoadedNonce`, which is the `document.fonts` subscriber
 * `Canvas` mounts once and feeds into this context.
 *
 * @returns The counter, to be used as a memo key or simply subscribed to; the value itself carries no meaning
 */
export function useFontsLoadedNonceContext(): number {
	return useContext(FontsLoadedNonceContext);
}
