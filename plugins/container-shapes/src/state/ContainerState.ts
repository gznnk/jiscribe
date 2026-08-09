import type { CreateObjectState } from "@jiscribe/canvas";

import type { ContainerFeatures } from "../schema/ContainerDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ContainerStateBrand: unique symbol;

export type ContainerState = CreateObjectState<
	typeof ContainerFeatures,
	typeof ContainerStateBrand,
	{
		/** Header band fill, independent of `fill` (the body). Default `"auto"` = theme surface. */
		headerFill?: string;
		/** Header band height in local pixels. Default CONTAINER_HEADER_HEIGHT. */
		headerHeight?: number;
	}
>;
