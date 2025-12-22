import { AiDefaultState } from "../../../constants/state/diagrams/AiDefaultState";
import type { AiState } from "../../../types/state/diagrams/AiState";
import { createInputState } from "../../elements/input/createInputState";
import { newId } from "../../shapes/common/newId";

/**
 * Create Ai state
 */
export const createAiState = ({ x, y }: { x: number; y: number }): AiState => {
	const inputState = createInputState({
		x,
		y,
		text: "",
	});

	// Remove connectPoints from inputState before adding to items
	const { connectPoints: _, ...inputWithoutConnectPoints } = inputState;

	return {
		...AiDefaultState,
		id: newId(),
		x,
		y,
		items: [inputWithoutConnectPoints],
	};
};
