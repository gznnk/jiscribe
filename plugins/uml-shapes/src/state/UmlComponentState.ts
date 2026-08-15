import type { CreateObjectState } from "@jiscribe/canvas";

import type { UmlComponentFeatures } from "../schema/UmlComponentDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const UmlComponentStateBrand: unique symbol;

export type UmlComponentState = CreateObjectState<
	typeof UmlComponentFeatures,
	typeof UmlComponentStateBrand
>;
