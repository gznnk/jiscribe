import { SvgDefaultData } from "../../../constants/data/shapes/SvgDefaultData";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { SvgData } from "../../../types/data/shapes/SvgData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { SvgState } from "../../../types/state/shapes/SvgState";
import { createStateToDataMapper } from "../../core/createStateToDataMapper";

export const mapSvgStateToData =
	createStateToDataMapper<SvgData>(SvgDefaultData);

export const svgStateToData = (state: Diagram): DiagramData =>
	mapSvgStateToData(state as SvgState);
