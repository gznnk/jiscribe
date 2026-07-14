import type { ActorFeatures } from "../../../../schemas/objects/general/actor/ActorDoc";
import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ActorStateBrand: unique symbol;

export type ActorState = CreateObjectState<
	typeof ActorFeatures,
	typeof ActorStateBrand
>;
