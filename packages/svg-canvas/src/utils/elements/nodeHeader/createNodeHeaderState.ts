import { NodeHeaderDefaultState } from "../../../constants/state/elements/NodeHeaderDefaultState";
import type { NodeHeaderState } from "../../../types/state/elements/NodeHeaderState";
import { newId } from "../../shapes/common/newId";

/**
 * Create NodeHeader state
 */
export const createNodeHeaderState = ({
	x,
	y,
	text = "Chat Area",
}: {
	x: number;
	y: number;
	text?: string;
}): NodeHeaderState => ({
	...NodeHeaderDefaultState,
	id: newId(),
	x,
	y,
	text,
});
