import { SvgDefaultState } from "../../../constants/state/shapes/SvgDefaultState";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { SvgState } from "../../../types/state/shapes/SvgState";
import { createDataToStateMapper } from "../../core/createDataToStateMapper";

export const mapSvgDataToState =
	createDataToStateMapper<SvgState>(SvgDefaultState);

export const svgDataToState = (data: DiagramData): Diagram =>
	mapSvgDataToState(data);
