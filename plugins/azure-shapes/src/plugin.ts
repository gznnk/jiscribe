import type { CanvasPlugin } from "@jiscribe/canvas";

import { azureIconDefinition } from "./definition";

/**
 * The declaration `<Canvas initialConfig>`'s `plugins` takes. The headless way
 * in is `azureShapesDocPlugin` in `./doc`. The presets are not on the default
 * bar, so a host mounts `azureStencilCategory` into `stencilLibrary.sections`
 * or `toolbar.sections`.
 */
export const azureShapesPlugin: CanvasPlugin = {
	id: "azure-shapes",
	objects: { azureIcon: azureIconDefinition },
};
