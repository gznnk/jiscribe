import type { SubroutineFeatures } from "../../../../schemas/objects/primitives/subroutine/SubroutineDoc";
import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const SubroutineStateBrand: unique symbol;

export type SubroutineState = CreateObjectState<
	typeof SubroutineFeatures,
	typeof SubroutineStateBrand
>;
