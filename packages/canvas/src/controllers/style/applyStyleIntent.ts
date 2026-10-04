import { collectStyleTargets } from "./collectStyleTargets";
import type { StyleIntentRegistries } from "./ObjectStyleRegistry";
import type { ErasedStyleEntry } from "./StyleEntry";
import type { StyleIntent } from "./StyleIntent";
import { styleIntentValue } from "./StyleIntent";
import type { CanvasControllerState } from "../CanvasTypes";
import { createCowObjects } from "../utils/cowObjects";

/**
 * Reflects one style intent in every object the selection reaches
 * (`collectStyleTargets`), each through its own type's entry for that intent.
 * A target whose type takes no such intent, or whose entry answers null, is left
 * as it stands.
 *
 * @param state - The state to write into; its selection decides who is reached
 * @param intent - What to reflect, with its value
 * @param registries - The canvas's style tables and shape-style defaults
 * @returns The next state, or `state` itself (same reference) when no object changed
 */
export const applyStyleIntent = (
	state: CanvasControllerState,
	intent: StyleIntent,
	registries: StyleIntentRegistries,
): CanvasControllerState => {
	const targets = collectStyleTargets(state);
	if (targets.length === 0) {
		return state;
	}

	// Copy-on-write view instead of a full spread: slider drags apply once per
	// pointermove frame (#213). handleGesture / the reducer materialize.
	const updatedObjects = createCowObjects(state.objects);
	const value = styleIntentValue(intent);
	let changed = false;

	for (const { object, pick, selected } of targets) {
		// Read through the view, so a target the walk has already written to — a
		// group and a member of it can both be selected — is the one written again.
		const current = updatedObjects[object.id];
		const entry = registries.objectStyle.get(current.type)?.[intent.kind] as
			ErasedStyleEntry | undefined;
		if (entry === undefined) {
			continue;
		}
		const updated = entry.apply(current, pick, value, {
			selected,
			shapeStyleDefaults: registries.objectShapeStyleDefaults,
		});
		if (updated === null || updated === current) {
			continue;
		}
		updatedObjects[object.id] = updated;
		changed = true;
	}

	return changed ? { ...state, objects: updatedObjects } : state;
};
