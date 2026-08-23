import type {
	ResolvedViewPadding,
	ViewDoc,
} from "@jiscribe/doc/model/canvas/ViewDoc";
import { resolveViewPadding } from "@jiscribe/doc/model/canvas/ViewDoc";

import type { ScrollBoundsConfig } from "../CanvasTypes";

/** Margin left outside the content when a host's `padding` is omitted (world units). */
const DEFAULT_SCROLL_BOUNDS_PADDING = 100;

/**
 * The one place the scroll wall is decided: the host's mount-time setting beats
 * the document's own declaration, which beats the endless board.
 *
 * A host that passes `scrollBounds` is answering for the whole surface, so its
 * setting is taken as given — uniform padding included, with `view.padding`
 * playing no part. A document left to itself gets the wall on its own frame:
 * exactly the box it is opened and exported at, so the page it presents is the
 * page it can be panned over.
 *
 * @param hostConfig - `initialConfig.scrollBounds` as read at mount, or null when
 *   the host left the decision to the document
 * @param view - The `view` of the document *currently loaded*, so replacing the
 *   document moves the wall with it; undefined declares nothing
 * @returns The per-side margin the wall stands out at, or null when panning is
 *   unrestricted. Measuring the content is left to the caller — this answers
 *   whether there is a wall at all without walking a single object.
 */
export const resolveScrollWallPadding = (
	hostConfig: ScrollBoundsConfig | null,
	view: ViewDoc | undefined,
): ResolvedViewPadding | null => {
	if (hostConfig !== null) {
		if (hostConfig.mode !== "content") {
			return null;
		}
		const padding = hostConfig.padding ?? DEFAULT_SCROLL_BOUNDS_PADDING;
		return { top: padding, right: padding, bottom: padding, left: padding };
	}
	return view?.scroll === "content" ? resolveViewPadding(view.padding) : null;
};
