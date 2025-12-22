import { ImageDefaultData } from "../../../constants/data/shapes/ImageDefaultData";
import type { DiagramData } from "../../../types/data/core/DiagramData";
import type { ImageData } from "../../../types/data/shapes/ImageData";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { ImageState } from "../../../types/state/shapes/ImageState";
import { createStateToDataMapper } from "../../core/createStateToDataMapper";

export const mapImageStateToData =
	createStateToDataMapper<ImageData>(ImageDefaultData);

export const imageStateToData = (state: Diagram): DiagramData =>
	mapImageStateToData(state as ImageState);
