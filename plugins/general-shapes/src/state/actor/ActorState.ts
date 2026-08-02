import type { CreateObjectState } from "@workspace/canvas";

import type { ActorFeatures } from "../../schema/actor/ActorDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ActorStateBrand: unique symbol;

export type ActorState = CreateObjectState<
	typeof ActorFeatures,
	typeof ActorStateBrand
>;
