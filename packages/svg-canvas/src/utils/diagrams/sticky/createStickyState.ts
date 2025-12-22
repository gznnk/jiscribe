import { StickyDefaultState } from "../../../constants/state/diagrams/StickyDefaultState";
import type { StickyState } from "../../../types/state/diagrams/StickyState";
import { newId } from "../../shapes/common/newId";

/**
 * Create Sticky state
 */
export const createStickyState = ({
	x,
	y,
}: {
	x: number;
	y: number;
}): StickyState => ({
	...StickyDefaultState,
	id: newId(),
	x,
	y,
});
