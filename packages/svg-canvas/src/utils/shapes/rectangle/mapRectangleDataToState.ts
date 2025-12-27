import { RectangleDefaultState } from "../../../constants/state/shapes/RectangleDefaultState";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { RectangleData } from "../../../types/data/shapes/RectangleData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { RectangleState } from "../../../types/state/shapes/RectangleState";
import { createDataToStateMapper } from "../../core/createDataToStateMapper";

export const mapRectangleDataToState = createDataToStateMapper<RectangleState>(
	RectangleDefaultState,
);

export const rectangleDataToState = (data: DiagramData): Diagram =>
	mapRectangleDataToState(data as RectangleData);
