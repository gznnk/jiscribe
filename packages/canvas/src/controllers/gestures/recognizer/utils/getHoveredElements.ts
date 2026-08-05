import { getGestureTarget } from "./getGestureTarget";
import type { HoveredElement } from "../GestureRecognizerTypes";

/**
 * Returns a memoized getter over getHoveredElements. document.elementsFromPoint
 * is a full hit test that forces a layout flush, yet most gesture consumers never
 * read the hover state (during drags only connection-anchor handling does), so the
 * Gesture carries this lazy getter instead of an eagerly computed array (#123).
 * The result is memoized so repeated reads within one gesture event hit-test once.
 */
export const createGetHovered = (
	x: number,
	y: number,
	exclude?: { id: string; part?: string },
	rootElement?: Element | null,
): (() => HoveredElement[]) => {
	let memoizedHovered: HoveredElement[] | null = null;
	return () =>
		(memoizedHovered ??= getHoveredElements(x, y, exclude, rootElement));
};

/**
 * Get the hovered elements at a coordinate (deduplicated, excluding the drag
 * origin). Passing rootElement excludes elements outside the canvas.
 *
 * The exclusion matches the origin element's full identity (id AND part), not
 * the id alone: a control whose data-id is its owner entity's UUID (e.g. a
 * connection anchor, data-part="anchor:<pos>") must not blind the hover
 * detection to the entity itself — otherwise dropping a self-loop connector
 * onto its own shape would never find the shape.
 */
export const getHoveredElements = (
	x: number,
	y: number,
	exclude?: { id: string; part?: string },
	rootElement?: Element | null,
): HoveredElement[] => {
	const allElements = document.elementsFromPoint(x, y);
	const elements =
		rootElement != null
			? allElements.filter((el) => rootElement.contains(el))
			: allElements;
	const hovered: HoveredElement[] = [];
	const seenIds = new Set<string>();
	for (const el of elements) {
		const item = getGestureTarget(el);
		if (!item) {
			continue;
		}

		if (item.kind === "canvas") {
			continue;
		}

		// Deduplication: skip if the same id already exists
		if (seenIds.has(item.id)) {
			continue;
		}

		// Do not add the drag origin element itself to hovered. The exclusion is
		// checked before seenIds.add so that an excluded control (e.g. a connection
		// anchor whose data-id is its owner entity's UUID) does not consume the id
		// slot — otherwise a lower element sharing that id (the entity body) would be
		// silently deduped away, blinding hover detection to the entity itself.
		if (exclude && item.id === exclude.id && item.part === exclude.part) {
			continue;
		}

		seenIds.add(item.id);
		hovered.push(item);
	}
	return hovered;
};
