import { useEffect, useRef, useState } from "react";

import type { DocFontRequest } from "../utils/collectDocFontRequests";

/**
 * How long the content stays hidden waiting for the faces. A cold cache on a
 * JP-heavy document is a few hundred KB, and a canvas still blank past this is
 * worse than the re-flow — which the fonts-loaded nonce repairs anyway.
 */
const FONT_PRELOAD_TIMEOUT_MS = 2000;

/** The size the faces are asked for; a face is one file per weight, whatever size it is asked at. */
const FONT_PRELOAD_SIZE_PX = 16;

/** The FontFaceSet, or null where there is none to ask (jsdom, any non-browser host). */
const getFontFaceSet = (): FontFaceSet | null =>
	typeof document === "undefined" || !document.fonts ? null : document.fonts;

/**
 * Fetches the faces a document draws in, once at mount, and reports when the
 * canvas may show its content.
 *
 * With unicode-range subsets nothing is pending until text has been laid out, so
 * `document.fonts.ready` cannot be waited on — the browser has not been asked
 * for a single subset yet. Naming the characters (`document.fonts.load`) is what
 * makes it fetch exactly the ones the document draws from, and holding the
 * content back until then is what keeps the first visible frame measured against
 * the face it is drawn in.
 *
 * **Mount only.** A document swapped in later is not preloaded; its boxes are
 * re-measured through the `useFontsLoadedNonce` path alone, i.e. visibly.
 *
 * @param collectRequests - Produces the faces to fetch; called once, in the mount effect, so it sees the first render's state and costs nothing on later renders
 * @param onSettled - Called just before the settled flag flips, in the same synchronous callback, so a re-measure it triggers lands in the same commit as the reveal
 * @returns Whether the content may be shown: false only while faces are being fetched, and true from the first render where there is no FontFaceSet to ask
 */
export const useDocFontsPreload = (
	collectRequests: () => DocFontRequest[],
	onSettled?: () => void,
): boolean => {
	const [isSettled, setIsSettled] = useState(() => getFontFaceSet() === null);

	// Both are read once, in the mount effect below, so neither has to hold its
	// identity across renders.
	const collectRequestsRef = useRef(collectRequests);
	const onSettledRef = useRef(onSettled);
	useEffect(() => {
		collectRequestsRef.current = collectRequests;
		onSettledRef.current = onSettled;
	});

	useEffect(() => {
		const fonts = getFontFaceSet();
		if (fonts === null) {
			return;
		}
		let hasSettled = false;
		const settle = (): void => {
			if (hasSettled) {
				return;
			}
			hasSettled = true;
			onSettledRef.current?.();
			setIsSettled(true);
		};

		const requests = collectRequestsRef.current();
		// A document that draws no text has nothing to wait for, and nothing to
		// hide either.
		if (requests.length === 0) {
			settle();
			return;
		}

		const timeoutId = window.setTimeout(settle, FONT_PRELOAD_TIMEOUT_MS);
		// A face that cannot be fetched — an offline machine, a blocked host — is
		// not worth a blank canvas: the stacks all end in a generic keyword, so the
		// drawing happens either way.
		void Promise.allSettled(
			requests.map((request) =>
				fonts.load(
					`${request.fontStyle} ${request.fontWeight} ${FONT_PRELOAD_SIZE_PX}px ${request.fontFamily}`,
					request.text,
				),
			),
		).then(() => {
			window.clearTimeout(timeoutId);
			settle();
		});
		return () => {
			// Nothing may settle after this: hasSettled guards the pending promise,
			// and the timer is dropped outright.
			hasSettled = true;
			window.clearTimeout(timeoutId);
		};
	}, []);

	return isSettled;
};
