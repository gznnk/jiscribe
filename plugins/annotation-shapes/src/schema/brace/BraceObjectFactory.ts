import { createFrameObjectFactory } from "@workspace/canvas/unstable-doc";

import type { BraceDirection, BraceDoc } from "./BraceDoc";
import { BRACE_DOC_DEFAULTS } from "./BraceDoc";

const frameFactory = createFrameObjectFactory(BRACE_DOC_DEFAULTS);

/**
 * Direction a drag of this shape implies. The box's long side is the span the
 * arms cover, so the drag's own proportions already say which axis the brace
 * runs along; the side is then the one that reads as default in that axis — the
 * typographic `{` for a tall drag, and a brace under a row for a wide one.
 */
const resolveDragDirection = (width: number, height: number): BraceDirection =>
	width >= height ? "down" : "left";

/**
 * Drag-drawing derives `direction` from the drawn proportions instead of always
 * producing the default one, because a `left` brace squeezed into a wide box is
 * a brace drawn along the wrong axis. An explicit `direction` override still
 * wins, so a preset can pin a side.
 */
const createDocFromBounds: NonNullable<
	typeof frameFactory.createDocFromBounds
> = (x1, y1, x2, y2, overrides, minSize, docDefaults) => {
	const drawn = frameFactory.createDocFromBounds?.(
		x1,
		y1,
		x2,
		y2,
		overrides,
		minSize,
		docDefaults,
	) as BraceDoc | null | undefined;
	if (drawn === undefined || drawn === null) {
		return null;
	}
	const braceDoc: BraceDoc = {
		...drawn,
		direction:
			(overrides as { direction?: BraceDirection } | undefined)?.direction ??
			resolveDragDirection(drawn.width, drawn.height),
	};
	return braceDoc;
};

/** Factory for creating Brace shapes (Frame-family shared logic, plus the drawn direction). */
export const BraceObjectFactory = { ...frameFactory, createDocFromBounds };
