import { GroupDefaultState } from "../../../constants/state/shapes/GroupDefaultState";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { GroupState } from "../../../types/state/shapes/GroupState";
import { createDataToStateMapper } from "../../core/createDataToStateMapper";

export const mapGroupDataToState =
	createDataToStateMapper<GroupState>(GroupDefaultState);

export const groupDataToState = (data: DiagramData): Diagram =>
	mapGroupDataToState(data);
