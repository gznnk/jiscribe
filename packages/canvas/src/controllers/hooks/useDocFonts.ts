import { useEffect, useRef } from "react";

import { useDocFontsPreload } from "./useDocFontsPreload";
import { useFontsLoadedNonce } from "./useFontsLoadedNonce";
import type { DocFontRequest } from "../utils/collectDocFontRequests";

type UseDocFontsOptions = {
	/** Produces the faces to fetch; called once in the mount effect (see {@link useDocFontsPreload}). */
	collectRequests: () => DocFontRequest[];
	/**
	 * Called whenever the faces the document can draw with change: once when the
	 * mount preload settles (before the flag flips, same synchronous callback) and
	 * again for every later arrival {@link useFontsLoadedNonce} reports.
	 */
	onFacesChanged?: () => void;
};

type DocFontsState = {
	/**
	 * A counter that changes whenever the faces do; only its identity matters, so
	 * use it as a memo key or a context value rather than reading the number.
	 */
	fontsNonce: number;
	/** Whether the canvas must keep its content back, i.e. the preload has not settled yet. */
	isContentHidden: boolean;
};

/**
 * The font side of a canvas, as one signal and one gate.
 *
 * A box derived from its content is measured in JS the moment a doc is mapped,
 * which on a first paint is before any web font has arrived — so it is measured
 * against whatever the generic keyword at the end of the stack resolves to, then
 * drawn a moment later in a face with different metrics. Nothing about the doc
 * or the theme changes when the real face lands, so a face arriving is a signal
 * of its own, and the only thing a stale measurement can be invalidated by.
 *
 * Two signals produce it and neither subsumes the other. The preload fetches the
 * mounted document's own faces while the content is held back, so the first
 * frame anyone sees is already measured against what it is drawn in; the
 * fonts-loaded nonce covers everything nobody waited for — a doc swapped in
 * after mount, and the unicode-range fetch typing a JP character triggers. They
 * are folded into a single counter because neither says anything but "measure
 * again", and a re-measure that moves no box is free.
 *
 * `onFacesChanged` is the same statement pushed at a caller that has state to
 * re-measure (Canvas dispatches `REMEASURE_TEXT`); `fontsNonce` is it pulled by
 * the sites that measure while they render and so change no state at all.
 *
 * @param options - `collectRequests` produces the faces to fetch and `onFacesChanged` is notified when they change; both are read through a ref, so inline arrows cost nothing
 * @returns `fontsNonce`, an invalidation counter for memo keys and contexts, and `isContentHidden`, true only while the mount preload is still fetching
 */
export const useDocFonts = ({
	collectRequests,
	onFacesChanged,
}: UseDocFontsOptions): DocFontsState => {
	const fontsLoadedNonce = useFontsLoadedNonce();
	const isSettled = useDocFontsPreload(collectRequests, onFacesChanged);

	// Read only from the effect below, so the callback does not have to hold its
	// identity across renders.
	const onFacesChangedRef = useRef(onFacesChanged);
	useEffect(() => {
		onFacesChangedRef.current = onFacesChanged;
	});

	useEffect(() => {
		if (fontsLoadedNonce > 0) {
			onFacesChangedRef.current?.();
		}
	}, [fontsLoadedNonce]);

	return {
		fontsNonce: fontsLoadedNonce + (isSettled ? 1 : 0),
		isContentHidden: !isSettled,
	};
};
