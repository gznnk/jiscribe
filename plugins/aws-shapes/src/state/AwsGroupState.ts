import type { CreateObjectState } from "@jiscribe/canvas";

import type { AwsGroupFeatures } from "../schema/AwsGroupDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const AwsGroupStateBrand: unique symbol;

export type AwsGroupState = CreateObjectState<
	typeof AwsGroupFeatures,
	typeof AwsGroupStateBrand,
	{
		/** Which frame this is. Omitted = DEFAULT_AWS_GROUP_KIND. */
		kind?: string;
	}
>;
