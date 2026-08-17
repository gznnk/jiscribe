import type { CreateObjectState } from "@jiscribe/canvas";

import type { IconFeatures } from "../schema/IconDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const IconStateBrand: unique symbol;

export type IconState = CreateObjectState<
	typeof IconFeatures,
	typeof IconStateBrand,
	{
		/** Which icon to draw, as a name of the bundled set. Omitted = DEFAULT_ICON_NAME. */
		icon?: string;
	}
>;
