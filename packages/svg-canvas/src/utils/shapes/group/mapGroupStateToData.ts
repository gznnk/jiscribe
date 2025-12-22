import { GroupDefaultData } from "../../../constants/data/shapes/GroupDefaultData";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { GroupData } from "../../../types/data/shapes/GroupData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { GroupState } from "../../../types/state/shapes/GroupState";
import { createStateToDataMapper } from "../../core/createStateToDataMapper";

export const mapGroupStateToData =
	createStateToDataMapper<GroupData>(GroupDefaultData);

export const groupStateToData = (state: Diagram): DiagramData =>
	mapGroupStateToData(state as GroupState);
