import { createFrameObjectFactory } from "@jiscribe/canvas-sdk/doc";
import type { ObjectDoc } from "@jiscribe/doc";

import type { GroupMarkerDirection } from "./GroupMarkerFields";

/**
 * Direction a drag of a group marker implies. The box's long side is the span
 * the arms cover, so the drag's own proportions already say which axis the
 * marker runs along; the side is then the one that reads as default in that
 * axis — the typographic `{` / `[` for a tall drag, and a marker under a row for
 * a wide one.
 */
const resolveDragDirection = (
	width: number,
	height: number,
): GroupMarkerDirection => (width >= height ? "down" : "left");

/**
 * Builds a group marker's factory: the Frame-family one, except that
 * drag-drawing derives `direction` from the drawn proportions instead of always
 * producing the default one, because a `left` marker squeezed into a wide box is
 * a marker drawn along the wrong axis. An explicit `direction` override still
 * wins, so a preset can pin a side.
 *
 * @param defaults The type's DOC_DEFAULTS; Frame-family shape, so it carries width / height.
 * @returns The factory to register as the type's `factory`.
 */
export const createGroupMarkerObjectFactory = (
	defaults: Parameters<typeof createFrameObjectFactory>[0],
) => {
	const frameFactory = createFrameObjectFactory(defaults);

	const createDocFromBounds: NonNullable<
		typeof frameFactory.createDocFromBounds
	> = (x1, y1, x2, y2, overrides, minSize) => {
		const drawn = frameFactory.createDocFromBounds?.(
			x1,
			y1,
			x2,
			y2,
			overrides,
			minSize,
		) as (ObjectDoc & { width: number; height: number }) | null | undefined;
		if (drawn === undefined || drawn === null) {
			return null;
		}
		return {
			...drawn,
			direction:
				(overrides as { direction?: GroupMarkerDirection } | undefined)
					?.direction ?? resolveDragDirection(drawn.width, drawn.height),
		};
	};

	return { ...frameFactory, createDocFromBounds };
};
