import { getKindAndId } from "./getKindAndId";
import type { HoveredElement } from "../GestureRecognizerTypes";

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

		// Do not add the drag origin element itself to hovered
		if (exclude && item.id === exclude.id && item.part === exclude.part) {
			continue;
		}
		hovered.push(item);
	}
	return hovered;
};
