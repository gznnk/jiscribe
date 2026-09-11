import type { CanvasPlugin } from "@jiscribe/canvas";

import { awsGroupDefinition, awsIconDefinition } from "./definition";

/**
 * The declaration `<Canvas initialConfig>`'s `plugins` takes. The headless way
 * in is `awsShapesDocPlugin` in `./doc`. The palette entries are not on the
 * default bar, so a host mounts `awsStencilCategory` /
 * `awsGroupStencilCategory` into `stencilLibrary.sections` or `toolbar.sections`.
 */
export const awsShapesPlugin: CanvasPlugin = {
	id: "aws-shapes",
	objects: { awsIcon: awsIconDefinition, awsGroup: awsGroupDefinition },
};
