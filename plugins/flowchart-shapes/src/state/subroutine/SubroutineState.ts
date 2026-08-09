import type { CreateObjectState } from "@jiscribe/canvas";

import type { SubroutineFeatures } from "../../schema/subroutine/SubroutineDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const SubroutineStateBrand: unique symbol;

export type SubroutineState = CreateObjectState<
	typeof SubroutineFeatures,
	typeof SubroutineStateBrand
>;
