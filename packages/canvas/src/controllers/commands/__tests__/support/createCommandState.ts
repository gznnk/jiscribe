import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";

import { deepFreezeState } from "../../../__tests__/support/deepFreezeState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createInitialControllerState } from "../../../reducer/createInitialControllerState";
import { createTestRegistries } from "../../../registries/createCanvasRegistries";

/**
 * Build a CanvasControllerState for command integration tests.
 *
 * Built on the same createInitialControllerState production uses, so the defaults cannot drift
 * from prod. The returned state is frozen by deepFreezeState to detect in-place mutation.
 *
 * @param doc - Seeds the objects and rootIds; pass one already shaped like a parsed doc, since
 *   nothing here validates it
 * @param overrides - Test-specific differences such as the selection or rootIds order, applied
 *   over the initial state as a shallow merge, so a nested field must be supplied whole
 */
export const createCommandState = (
	doc: CanvasDoc,
	overrides?: Partial<CanvasControllerState>,
): CanvasControllerState =>
	deepFreezeState({
		...createInitialControllerState(doc, createTestRegistries()),
		...overrides,
	});
