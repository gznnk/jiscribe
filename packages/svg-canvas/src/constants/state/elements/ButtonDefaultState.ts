import { ButtonFeatures } from "../../../types/data/elements/ButtonData";
import type { ButtonState } from "../../../types/state/elements/ButtonState";
import { ButtonDefaultData } from "../../data/elements/ButtonDefaultData";
import { CreateDefaultState } from "../shapes/CreateDefaultState";

/**
 * Default state values for Button
 */
export const ButtonDefaultState: ButtonState = CreateDefaultState<ButtonState>({
	type: "Button",
	options: ButtonFeatures,
	baseData: ButtonDefaultData,
});
