import { PathDefaultData } from "../../../constants/data/shapes/PathDefaultData";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { PathData } from "../../../types/data/shapes/PathData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { PathState } from "../../../types/state/shapes/PathState";
import { createStateToDataMapper } from "../../core/createStateToDataMapper";

export const mapPathStateToData =
	createStateToDataMapper<PathData>(PathDefaultData);

export const pathStateToData = (state: Diagram): DiagramData =>
	mapPathStateToData(state as PathState);
