import type { CreateStateType } from "./CreateStateType";
import type { ImageData, ImageFeatures } from "../../data/shapes/ImageData";

/**
 * State type for Image component.
 */
export type ImageState = CreateStateType<ImageData, typeof ImageFeatures>;
