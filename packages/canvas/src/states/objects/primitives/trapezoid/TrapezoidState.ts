import type { TrapezoidFeatures } from "../../../../schemas/objects/primitives/trapezoid/TrapezoidDoc";
import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const TrapezoidStateBrand: unique symbol;

export type TrapezoidState = CreateObjectState<
	typeof TrapezoidFeatures,
	typeof TrapezoidStateBrand
>;
