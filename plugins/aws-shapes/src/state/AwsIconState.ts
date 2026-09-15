import type { CreateObjectState } from "@jiscribe/canvas";

import type { AwsIconFeatures } from "../schema/AwsIconDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const AwsIconStateBrand: unique symbol;

export type AwsIconState = CreateObjectState<
	typeof AwsIconFeatures,
	typeof AwsIconStateBrand,
	{
		/** Which icon to draw. Omitted = DEFAULT_AWS_ICON_NAME. */
		icon?: string;
	}
>;
