import { ImageDefaultState } from "../../../constants/state/shapes/ImageDefaultState";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { ImageState } from "../../../types/state/shapes/ImageState";
import { createDataToStateMapper } from "../../core/createDataToStateMapper";

export const mapImageDataToState =
	createDataToStateMapper<ImageState>(ImageDefaultState);

export const imageDataToState = (data: DiagramData): Diagram =>
	mapImageDataToState(data);
