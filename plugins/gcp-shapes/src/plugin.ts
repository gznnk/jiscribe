import type { CanvasPlugin } from "@jiscribe/canvas";

import { gcpIconDefinition } from "./definition";

/**
 * The declaration `<Canvas initialConfig>`'s `plugins` takes. The headless way
 * in is `gcpShapesDocPlugin` in `./doc`. The presets are not on the default
 * bar, so a host mounts `gcpStencilCategory` into `stencilLibrary.sections`
 * or `toolbar.sections`.
 */
export const gcpShapesPlugin: CanvasPlugin = {
	id: "gcp-shapes",
	objects: { gcpIcon: gcpIconDefinition },
};
