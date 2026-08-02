import type { ObjectTypeDefinition } from "@workspace/canvas";
import { createFrameBehavior } from "@workspace/canvas/unstable";

import { actorDocDefinition } from "./doc";
import { Actor } from "./presentation/Actor";
import { calcActorTextRegion } from "./presentation/calcActorTextRegion";
import { calcActorVisualBounds } from "./presentation/calcActorVisualBounds";
import type { ActorDoc } from "./schema/ActorDoc";
import { actorToDoc, actorToState } from "./state/ActorMapper";
import type { ActorState } from "./state/ActorState";
import { isValidActorState } from "./state/validateActorState";
import { ActorStencils } from "./stencil/ActorStencils";

/**
 * The label hangs below the geometry box, so `visualBounds` is what keeps
 * zoom-to-fit and the export viewBox from cropping it (calcActorVisualBounds).
 * `menu` stays undeclared, so it is derived from the features as before the move.
 */
export const actorDefinition: ObjectTypeDefinition<ActorDoc, ActorState> = {
	...actorDocDefinition,
	mapper: { toDoc: actorToDoc, toState: actorToState },
	stateValidator: isValidActorState,
	component: Actor,
	textRegion: calcActorTextRegion,
	visualBounds: calcActorVisualBounds,
	behavior: createFrameBehavior<ActorState>(),
	stencils: ActorStencils,
};
