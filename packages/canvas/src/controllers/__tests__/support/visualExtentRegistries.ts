import type { ObjectVisualBoundsRegistry } from "../../../rendering/objects/registry/ObjectVisualBoundsRegistry";
import { createTestRegistries } from "../../registries/createCanvasRegistries";
import type { VisualExtentRegistries } from "../../utils/VisualExtentRegistries";

/**
 * A canvas's visual-extent registries with the visual bounds replaced by a
 * stand-in, so a test can make a type draw outside its box without a plugin.
 * The geometry registries are a fresh canvas's, i.e. no type declares an
 * outline, an anchor region or extra connect points.
 */
export const createVisualExtentRegistries = (
	objectVisualBounds: Pick<ObjectVisualBoundsRegistry, "get">,
): VisualExtentRegistries => ({
	...createTestRegistries(),
	objectVisualBounds,
});
