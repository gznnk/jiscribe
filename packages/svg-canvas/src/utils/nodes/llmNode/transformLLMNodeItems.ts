import { createLLMNodeInputFrame } from "./createLLMNodeInputFrame";
import {
	MIN_WIDTH,
	MIN_HEIGHT,
} from "../../../constants/styling/nodes/LLMNodeStyling";
import type { Frame } from "../../../types/core/Frame";
import type { Diagram } from "../../../types/state/core/Diagram";

export const transformLLMNodeItems = (
	ownerFrame: Frame,
	items: Diagram[],
): Diagram[] => {
	if (items.length !== 2) {
		console.error("Invalid number of items");
		return items;
	}
	const input = items[1];

	return [
		items[0],
		{
			...input,
			...createLLMNodeInputFrame({
				...ownerFrame,
				minWidth: MIN_WIDTH,
				minHeight: MIN_HEIGHT,
			}),
		},
	];
};
