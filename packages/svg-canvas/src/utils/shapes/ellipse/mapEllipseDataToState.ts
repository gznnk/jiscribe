import { EllipseDefaultState } from "../../../constants/state/shapes/EllipseDefaultState";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { EllipseState } from "../../../types/state/shapes/EllipseState";
import { createDataToStateMapper } from "../../core/createDataToStateMapper";

export const mapEllipseDataToState =
	createDataToStateMapper<EllipseState>(EllipseDefaultState);

export const ellipseDataToState = (data: DiagramData): Diagram =>
	mapEllipseDataToState(data);
