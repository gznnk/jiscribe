import { getGestureTarget } from "./getGestureTarget";
import type { HoveredElement } from "../GestureRecognizerTypes";

/**
 * Returns a memoized getter over getHoveredElements. document.elementsFromPoint
 * is a full hit test that forces a layout flush, yet almost no gesture consumer
 * reads the hover state — a connector's double click is the one that does, to tell
 * a press on its label box from one on its line — so the Gesture carries this lazy
 * getter instead of an eagerly computed array (#123). The result is memoized so
 * repeated reads within one gesture event hit-test once.
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
 * the id alone: several controls share their owner entity's UUID as data-id, so
 * excluding by id would blind the hover detection to every one of its siblings.
 * A connector's vertex-insert handle and its label box are such a pair — telling
 * them apart is what the double click reads this for
 * (ConnectorVertexInsertHandler).
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
		// checked before seenIds.add so that an excluded control (one whose data-id is
		// its owner entity's UUID) does not consume the id slot — otherwise a lower
		// element sharing that id would be silently deduped away.
		if (exclude && item.id === exclude.id && item.part === exclude.part) {
			continue;
		}

		seenIds.add(item.id);
		hovered.push(item);
	}
	return hovered;
};
