import type { Dimensions } from "@jiscribe/geometry";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import {
	TextOverlayFrame,
	type TextOverlayFrameProps,
} from "./TextOverlayFrame";

/** Off screen and out of hit-testing, but laid out — `display: none` would not be. */
const MEASURE_CONTAINER_STYLE =
	"position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none";

/**
 * Lays `children` out in a TextOverlayFrame of the given box, off screen, and
 * returns the size the content takes — the measurement for a type that draws
 * its body as HTML of its own (a textMeasurer's building block; see
 * ObjectTextMeasurerRegistry). The frame is the one the canvas draws, so the
 * padding, line-height and typography are the drawn ones rather than a copy.
 *
 * The box is rendered synchronously into a detached root and removed before
 * this returns. A font the page has not loaded yet is measured as its fallback,
 * the same as the first paint of the canvas would show it.
 *
 * @param props - The frame's box and typography, as the type's overlay passes
 *   them, without the placement: `width` / `height` are the region's size in
 *   local px (negative clamps to 0, as the frame does), and `children` the body
 *   exactly as the overlay renders it. It must render its markup synchronously
 *   — content set from an effect is not there yet when the box is read
 * @returns The content's size, box padding included, in CSS px at zoom 1
 *   (= local px). Its width is the box's unless the content overflows sideways;
 *   each axis that overflows reports the overflowing extent, the others the
 *   fractional size
 * @throws when there is no `document` (a Node process), measuring being a
 *   browser-only answer; and when called while React is rendering or
 *   committing (from a render, or a `useEffect` / `useLayoutEffect` body),
 *   where `flushSync` cannot render the box. Call it from an event handler or a
 *   task instead
 */
export const measureTextOverlayContent = (
	props: Omit<TextOverlayFrameProps, "x" | "y" | "transform">,
): Dimensions => {
	if (typeof document === "undefined") {
		throw new Error(
			"measureTextOverlayContent needs a browser document to lay the content out in",
		);
	}

	const container = document.createElement("div");
	container.setAttribute("style", MEASURE_CONTAINER_STYLE);
	container.setAttribute("aria-hidden", "true");
	document.body.appendChild(container);
	const root = createRoot(container);
	try {
		flushSync(() => {
			root.render(
				<svg
					width={Math.max(props.width, 0)}
					height={Math.max(props.height, 0)}
				>
					<TextOverlayFrame {...props} x={0} y={0} />
				</svg>,
			);
		});
		// foreignObject > wrapper > content, the structure TextOverlayFrame documents.
		const content =
			container.querySelector("foreignObject")?.firstElementChild
				?.firstElementChild;
		// flushSync renders nothing while React is mid-render or mid-commit.
		if (!(content instanceof HTMLElement)) {
			throw new Error(
				"measureTextOverlayContent was called while React is rendering or committing, where the box cannot be rendered synchronously; call it from an event handler or a task",
			);
		}
		// The fractional box first: scrollWidth / scrollHeight are rounded to whole
		// px and would report a region of 200.6 as overflowed by a 201 that fits.
		const box = content.getBoundingClientRect();
		return {
			width:
				content.scrollWidth > content.clientWidth
					? content.scrollWidth
					: box.width,
			height:
				content.scrollHeight > content.clientHeight
					? content.scrollHeight
					: box.height,
		};
	} finally {
		root.unmount();
		container.remove();
	}
};
