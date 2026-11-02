import type { CreateObjectState } from "@jiscribe/canvas";

import type { AzureIconFeatures } from "../schema/AzureIconDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const AzureIconStateBrand: unique symbol;

export type AzureIconState = CreateObjectState<
	typeof AzureIconFeatures,
	typeof AzureIconStateBrand,
	{
		/** Which icon to draw. Omitted = DEFAULT_AZURE_ICON_NAME. */
		icon?: string;
	}
>;
