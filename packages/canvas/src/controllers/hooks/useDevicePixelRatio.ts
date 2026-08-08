import { useEffect, useState } from "react";

/** The ratio outside a browser (SSR, node tests), where there is no device to ask. */
const FALLBACK_DEVICE_PIXEL_RATIO = 1;

const readDevicePixelRatio = (): number =>
	typeof window === "undefined"
		? FALLBACK_DEVICE_PIXEL_RATIO
		: window.devicePixelRatio;

/**
 * The window's device pixel ratio, re-read whenever it changes.
 *
 * A ResizeObserver does not see this: moving a window to a display with another
 * scale factor leaves the CSS size untouched and changes only the ratio. The
 * media query carries the ratio it watches, so it is re-registered after every
 * change rather than subscribed to once.
 *
 * @returns The current ratio, or 1 outside a browser
 */
export const useDevicePixelRatio = (): number => {
	const [devicePixelRatio, setDevicePixelRatio] =
		useState(readDevicePixelRatio);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		const query = window.matchMedia(
			`(resolution: ${window.devicePixelRatio}dppx)`,
		);
		// The query stops matching the moment the ratio moves off the one it was
		// built for, which is the signal to read the new value and re-register.
		const handleChange = () => setDevicePixelRatio(readDevicePixelRatio());
		query.addEventListener("change", handleChange);
		// The ratio may already have moved between render and this effect.
		handleChange();
		return () => query.removeEventListener("change", handleChange);
	}, [devicePixelRatio]);

	return devicePixelRatio;
};
