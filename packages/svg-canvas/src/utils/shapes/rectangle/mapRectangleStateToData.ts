import { RectangleDefaultData } from "../../../constants/data/shapes/RectangleDefaultData";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { RectangleData } from "../../../types/data/shapes/RectangleData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { RectangleState } from "../../../types/state/shapes/RectangleState";
import { createStateToDataMapper } from "../../core/createStateToDataMapper";

export const mapRectangleStateToData =
	createStateToDataMapper<RectangleData>(RectangleDefaultData);

export const rectangleStateToData = (state: Diagram): DiagramData =>
	mapRectangleStateToData(state as RectangleState);
