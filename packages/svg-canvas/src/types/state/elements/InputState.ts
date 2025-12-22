import type { InputData, InputFeatures } from "../../data/elements/InputData";
import type { CreateStateType } from "../shapes/CreateStateType";

/**
 * State type for Input shapes.
 * Contains state properties specific to Input diagram elements.
 */
export type InputState = CreateStateType<InputData, typeof InputFeatures>;
