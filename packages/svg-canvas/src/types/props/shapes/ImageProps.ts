import type { CreateDiagramProps } from "./CreateDiagramProps";
import type { ImageFeatures } from "../../data/shapes/ImageData";
import type { ImageState } from "../../state/shapes/ImageState";

/**
 * Props for the Image component.
 */
export type ImageProps = CreateDiagramProps<ImageState, typeof ImageFeatures>;
