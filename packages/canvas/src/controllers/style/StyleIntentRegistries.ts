import type { ObjectShapeStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectShapeStyleDefaultsRegistry";
import type { ObjectTextStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectTextStyleDefaultsRegistry";

import type { ObjectStyleRegistry } from "./ObjectStyleRegistry";
import type { ObjectPartKindRegistry } from "../selection/partKinds/ObjectPartKindRegistry";

/**
 * The registries a style walk reads: the tables, the defaults an entry's
 * `read` resolves through, and the part kinds a pick inside an object is
 * expanded through. Declared as its own shape so the walkers take a slice
 * rather than the whole canvas bundle, which stays structurally assignable to it
 * (ICanvasRegistries).
 */
export type StyleIntentRegistries = {
	objectStyle: ObjectStyleRegistry;
	objectShapeStyleDefaults: ObjectShapeStyleDefaultsRegistry;
	objectTextStyleDefaults: ObjectTextStyleDefaultsRegistry;
	objectPartKind: ObjectPartKindRegistry;
};
