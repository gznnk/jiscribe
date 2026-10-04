import { ConnectorFeatures } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import { EllipseFeatures } from "@jiscribe/doc/model/objects/primitives/ellipse/EllipseDoc";
import { GroupFeatures } from "@jiscribe/doc/model/objects/primitives/group/GroupDoc";
import { RectFeatures } from "@jiscribe/doc/model/objects/primitives/rect/RectDoc";
import type { ObjectShapeStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectShapeStyleDefaultsRegistry";
import { createObjectShapeStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectShapeStyleDefaultsRegistry";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { selectionOf } from "../../../selection/__tests__/support/selectionOf";
import type { ObjectPartSelection } from "../../../selection/ObjectPartSelection";
import { coreStyleTable } from "../../coreStyleTable";
import type { StyleIntentRegistries } from "../../ObjectStyleRegistry";
import { createObjectStyleRegistry } from "../../ObjectStyleRegistry";

/** A rect: both style groups, so it takes the fill intent. */
export const rectOf = (
	id: string,
	own: Record<string, unknown> = {},
): ObjectState =>
	({
		id,
		type: "rect",
		features: RectFeatures,
		...own,
	}) as unknown as ObjectState;

/** An ellipse, for a selection holding two types that both take the intent. */
export const ellipseOf = (
	id: string,
	own: Record<string, unknown> = {},
): ObjectState =>
	({
		id,
		type: "ellipse",
		features: EllipseFeatures,
		...own,
	}) as unknown as ObjectState;

/** A connector: stroke but no fill, so the fill intent passes it by. */
export const connectorOf = (id: string): ObjectState =>
	({
		id,
		type: "connector",
		features: ConnectorFeatures,
		stroke: "#000000",
	}) as unknown as ObjectState;

/** A group: no style of its own, its members answering instead. */
export const groupOf = (id: string, childIds: string[]): ObjectState =>
	({
		id,
		type: "group",
		features: GroupFeatures,
		childIds,
	}) as unknown as ObjectState;

/**
 * A state holding just what the style walk reads.
 *
 * @param selectedIds - The selection, in selection order
 * @param objects - Every object, keyed by id
 * @param part - What is picked inside the sole selected object, omitted for nothing
 */
export const stateOf = (
	selectedIds: readonly string[],
	objects: Record<string, ObjectState>,
	part: ObjectPartSelection | null = null,
): CanvasControllerState =>
	({
		selection: selectionOf(selectedIds, part),
		objects,
	}) as CanvasControllerState;

/**
 * The style wiring of every built-in type used by these fixtures, built the way
 * applyObjectDefinition builds it: each type's core table from its own features.
 *
 * @param shapeStyleDefaults - The defaults `read` resolves through; a fresh empty registry by default, so only SHAPE_STYLE_FALLBACK applies
 */
export const registriesOf = (
	shapeStyleDefaults: ObjectShapeStyleDefaultsRegistry = createObjectShapeStyleDefaultsRegistry(),
): StyleIntentRegistries => {
	const objectStyle = createObjectStyleRegistry();
	for (const features of [
		RectFeatures,
		EllipseFeatures,
		ConnectorFeatures,
		GroupFeatures,
	]) {
		objectStyle.register(features.type, coreStyleTable(features));
	}
	return { objectStyle, objectShapeStyleDefaults: shapeStyleDefaults };
};
