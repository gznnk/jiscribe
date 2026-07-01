import { getKindAndId } from "./getKindAndId";
import type { HoveredElement } from "../GestureRecognizerTypes";

/**
 * Get the hovered elements at a coordinate (deduplicated, excluding a given ID).
 * Passing rootElement excludes elements outside the canvas.
 */
export const getHoveredElements = (
	x: number,
	y: number,
	excludeId?: string,
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
		const item = getKindAndId(el);
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
		seenIds.add(item.id);

		// Do not add to hovered when it matches excludeId
		if (excludeId && item.id === excludeId) {
			continue;
		}
		hovered.push(item);
	}
	return hovered;
};
