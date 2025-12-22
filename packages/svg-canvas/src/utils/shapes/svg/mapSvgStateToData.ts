import { SvgDefaultData } from "../../../constants/data/shapes/SvgDefaultData";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { SvgData } from "../../../types/data/shapes/SvgData";
import type { Diagram } from "../../../types/state/core/Diagram";
import { createStateToDataMapper } from "../../core/createStateToDataMapper";

export const mapSvgStateToData =
	createStateToDataMapper<SvgData>(SvgDefaultData);

export const svgStateToData = (state: Diagram): DiagramData =>
	mapSvgStateToData(state as SvgData);
