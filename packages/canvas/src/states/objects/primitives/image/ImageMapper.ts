import type { ImageDoc } from "@jiscribe/doc/model/objects/primitives/image/ImageDoc";
import {
	IMAGE_EXTRA_KEYS,
	ImageFeatures,
} from "@jiscribe/doc/model/objects/primitives/image/ImageDoc";

import type { ImageState } from "./ImageState";
import { createFrameMapper } from "../../base/FrameMapper";

/**
 * ImageDoc ↔ ImageState conversion (Frame-family shared logic generated from features).
 * The allow-list takes the type's own fields from the one declaration of them
 * (IMAGE_EXTRA_KEYS), which the doc definition passes to doc-ops as well.
 */
export const { toState: imageToState, toDoc: imageToDoc } = createFrameMapper<
	ImageDoc,
	ImageState
>(ImageFeatures, IMAGE_EXTRA_KEYS);
