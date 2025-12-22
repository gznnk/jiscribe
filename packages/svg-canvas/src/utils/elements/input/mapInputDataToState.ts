import { InputDefaultState } from "../../../constants/state/elements/InputDefaultState";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { InputState } from "../../../types/state/elements/InputState";
import { createDataToStateMapper } from "../../core/createDataToStateMapper";

export const mapInputDataToState =
	createDataToStateMapper<InputState>(InputDefaultState);

export const inputDataToState = (data: DiagramData): Diagram =>
	mapInputDataToState(data);
