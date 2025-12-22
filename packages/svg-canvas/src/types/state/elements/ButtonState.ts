import type {
	ButtonData,
	ButtonFeatures,
} from "../../data/elements/ButtonData";
import type { CreateStateType } from "../shapes/CreateStateType";

/**
 * State type for Button shapes.
 * Contains properties specific to Button diagram elements.
 */
export type ButtonState = CreateStateType<ButtonData, typeof ButtonFeatures>;
