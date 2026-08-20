import { useEffect, useState } from "react";

/**
 * A number that changes whenever the faces the document can draw with do.
 *
 * Text boxes derived from their content are measured in JS the moment a doc is
 * mapped, which on a first paint is before any web font has arrived — so they
 * are measured against whatever the generic keyword at the end of the stack
 * resolves to, then drawn a moment later in a face with different metrics.
 * Nothing about the doc or the theme changes when the real face lands, so this
 * is the only signal a measurement can be invalidated by.
 *
 * Both events are needed and neither subsumes the other. `fonts.ready` settles
 * when the fonts the current layout asked for are done, which is the common
 * case; `loadingdone` fires again for every later request, which is what the
 * unicode-range split produces — typing the first JP character fetches a face
 * nothing had asked for until then.
 *
 * @returns A counter starting at 0, incremented once per font-loading event; only its identity matters, so use it as an effect dependency or a memo key rather than reading the value
 */
export const useFontsLoadedNonce = (): number => {
	const [nonce, setNonce] = useState(0);

	useEffect(() => {
		// Absent in jsdom and in any non-browser host; there are no web fonts to
		// wait for there, and the first measurement is already the final one.
		if (typeof document === "undefined" || !document.fonts) {
			return;
		}
		const fonts = document.fonts;
		let isMounted = true;
		const bump = (): void => {
			if (isMounted) {
				setNonce((previous) => previous + 1);
			}
		};

		void fonts.ready.then(bump);
		fonts.addEventListener("loadingdone", bump);
		return () => {
			isMounted = false;
			fonts.removeEventListener("loadingdone", bump);
		};
	}, []);

	return nonce;
};
