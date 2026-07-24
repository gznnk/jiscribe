import type { CreateObjectState } from "@workspace/canvas";

import type { TrapezoidFeatures } from "../../schema/trapezoid/TrapezoidDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const TrapezoidStateBrand: unique symbol;

export type TrapezoidState = CreateObjectState<
	typeof TrapezoidFeatures,
	typeof TrapezoidStateBrand
>;
