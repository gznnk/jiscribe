import type { ObjectTypeDefinition } from "@workspace/canvas";
import { createFrameBehavior } from "@workspace/canvas/unstable";

import { actorDocDefinition, cloudDocDefinition } from "./doc";
import { Actor } from "./presentation/Actor";
import { calcActorTextRegion } from "./presentation/calcActorTextRegion";
import { calcActorVisualBounds } from "./presentation/calcActorVisualBounds";
import { calcCloudTextRegion } from "./presentation/calcCloudTextRegion";
import { Cloud } from "./presentation/Cloud";
import { cloudOutline } from "./presentation/cloudOutline";
import type { ActorDoc } from "./schema/ActorDoc";
import type { CloudDoc } from "./schema/CloudDoc";
import { actorToDoc, actorToState } from "./state/ActorMapper";
import type { ActorState } from "./state/ActorState";
import { cloudToDoc, cloudToState } from "./state/CloudMapper";
import type { CloudState } from "./state/CloudState";
import { isValidActorState } from "./state/validateActorState";
import { isValidCloudState } from "./state/validateCloudState";
import { ActorStencils } from "./stencil/ActorStencils";
import { CloudStencils } from "./stencil/CloudStencils";

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

/**
 * `outline` is what attaches a connector's center anchor to the bumpy silhouette
 * instead of the bounding box (cloudOutline). `menu` stays undeclared, so it is
 * derived from the features as before the move.
 */
export const cloudDefinition: ObjectTypeDefinition<CloudDoc, CloudState> = {
	...cloudDocDefinition,
	mapper: { toDoc: cloudToDoc, toState: cloudToState },
	stateValidator: isValidCloudState,
	component: Cloud,
	textRegion: calcCloudTextRegion,
	outline: cloudOutline,
	behavior: createFrameBehavior<CloudState>(),
	stencils: CloudStencils,
};
