import type { CreateObjectState } from "@jiscribe/canvas";

import type { GcpIconFeatures } from "../schema/GcpIconDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const GcpIconStateBrand: unique symbol;

export type GcpIconState = CreateObjectState<
	typeof GcpIconFeatures,
	typeof GcpIconStateBrand,
	{
		/** Which icon to draw. Omitted = DEFAULT_GCP_ICON_NAME. */
		icon?: string;
	}
>;
