import { CreateDefaultState } from "./CreateDefaultState";
import { ImageFeatures } from "../../../types/data/shapes/ImageData";
import type { ImageState } from "../../../types/state/shapes/ImageState";
import { ImageDefaultData } from "../../data/shapes/ImageDefaultData";

export const ImageDefaultState = CreateDefaultState<ImageState>({
	type: "Image",
	options: ImageFeatures,
	baseData: ImageDefaultData,
	properties: {},
});
