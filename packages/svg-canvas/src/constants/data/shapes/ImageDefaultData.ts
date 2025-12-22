import { CreateDefaultData } from "./CreateDefaultData";
import type { ImageData } from "../../../types/data/shapes/ImageData";
import { ImageFeatures } from "../../../types/data/shapes/ImageData";

/**
 * Default image data template.
 * Generated using Features definition and CreateDefaultData helper.
 */
export const ImageDefaultData = CreateDefaultData<ImageData>({
	type: "Image",
	options: ImageFeatures,
	properties: {
		base64Data: "",
	},
});
