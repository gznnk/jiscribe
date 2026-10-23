import type { ObjectPartKindRegistry } from "../../../../../rendering/objects/registry/ObjectPartKindRegistry";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { readPickedPartStyleIntentKinds } from "../../../../selection/readers/readPickedPartStyleIntentKinds";
import { isGroupingOffered } from "../../../../utils/isGroupingOffered";

/**
 * Whether the sidebar's Arrange section holds the group / ungroup button.
 *
 * Offered on the ObjectMenu's terms (isGroupingOffered), and taken away by the
 * same picked part that takes the menu's grouping away: what a narrowing part is
 * offered is what it receives (readPickedPartStyleIntentKinds), and grouping acts
 * on the selection as a whole.
 *
 * @param state - The selection channels and the picked part are read
 * @param objectPartKind - Per-canvas registry of part kinds, asked whether the picked kind narrows the panel
 * @returns True while two or more objects, or a single group, are selected and no picked part narrows the panel
 */
export const isGroupingItemShown = (
	state: CanvasControllerState,
	objectPartKind: ObjectPartKindRegistry,
): boolean =>
	isGroupingOffered(state) &&
	readPickedPartStyleIntentKinds(state, objectPartKind) === null;
