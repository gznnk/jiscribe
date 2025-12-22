import { EllipseDefaultData } from "../../../constants/data/shapes/EllipseDefaultData";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { EllipseData } from "../../../types/data/shapes/EllipseData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { EllipseState } from "../../../types/state/shapes/EllipseState";
import { createStateToDataMapper } from "../../core/createStateToDataMapper";

export const mapEllipseStateToData =
	createStateToDataMapper<EllipseData>(EllipseDefaultData);

export const ellipseStateToData = (state: Diagram): DiagramData =>
	mapEllipseStateToData(state as EllipseState);
