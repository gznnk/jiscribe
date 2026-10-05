import { ConnectorFeatures } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import { EllipseFeatures } from "@jiscribe/doc/model/objects/primitives/ellipse/EllipseDoc";
import { GroupFeatures } from "@jiscribe/doc/model/objects/primitives/group/GroupDoc";
import { RectFeatures } from "@jiscribe/doc/model/objects/primitives/rect/RectDoc";
import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";
import type { RichText } from "@jiscribe/doc/model/objects/types/text/RichText";
import { BODY_TEXT_SLOT_ID } from "@jiscribe/doc/model/objects/types/text/TextSlot";
import type { ObjectShapeStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectShapeStyleDefaultsRegistry";
import { createObjectShapeStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectShapeStyleDefaultsRegistry";
import type { ObjectTextStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectTextStyleDefaultsRegistry";
import { createObjectTextStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectTextStyleDefaultsRegistry";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { TextSlots } from "../../../../states/objects/types/TextSlots";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { selectionOf } from "../../../selection/__tests__/support/selectionOf";
import type { ObjectPartSelection } from "../../../selection/ObjectPartSelection";
import { TEXT_SLOT_PART_KIND } from "../../../selection/textSlotPartKind";
import { coreStyleTable } from "../../coreStyleTable";
import type { StyleIntentRegistries } from "../../ObjectStyleRegistry";
import { createObjectStyleRegistry } from "../../ObjectStyleRegistry";
import type { StyleContext, TextEditRange } from "../../StyleEntry";

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
 * A shape holding text slots. Its features are a rect's, so it takes the fill
 * intent as well as the text ones.
 *
 * @param id - The object id
 * @param text - Its slots, keyed by slot id; the first key is the default slot
 * @param own - Extra fields to load onto the object (its `type`, say)
 */
export const textRectOf = (
	id: string,
	text: TextSlots,
	own: Record<string, unknown> = {},
): ObjectState =>
	({
		id,
		type: "rect",
		features: RectFeatures,
		text,
		...own,
	}) as unknown as ObjectState;

/** A rect's features with its text type replaced, for the types that hold a source-language body. */
export const featuresWithText = (
	text: ObjectFeatures["text"],
): ObjectFeatures => ({ ...RectFeatures, text });

/** A pick naming one text slot, the way a press on a slot stores it. */
export const slotPickOf = (slotId: string): ObjectPartSelection => ({
	kind: TEXT_SLOT_PART_KIND,
	ranges: [{ anchorId: slotId, focusId: slotId }],
});

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
 * A state with a shape editor open on one object, which a session is always the
 * sole selected one of (resolveTextEdit).
 *
 * @param objects - Every object, keyed by id
 * @param ownerId - The object being edited, which is also the selection
 * @param draft - The body the editor holds, which the committed slot need not match
 * @param selection - What the editor has selected, omitted for an editor that has not reported one
 */
export const editingStateOf = (
	objects: Record<string, ObjectState>,
	ownerId: string,
	draft: RichText,
	selection?: { start: number; end: number },
): CanvasControllerState =>
	({
		selection: selectionOf([ownerId]),
		objects,
		textEditState: { kind: "shape", text: draft, selection },
	}) as unknown as CanvasControllerState;

/**
 * The style wiring of every built-in type used by these fixtures, built the way
 * applyObjectDefinition builds it: each type's core table from its own features.
 *
 * @param shapeStyleDefaults - The defaults the shape `read`s resolve through; a fresh empty registry by default, so only SHAPE_STYLE_FALLBACK applies
 * @param textStyleDefaults - The defaults the slot `read`s resolve through; a fresh empty registry by default, so a field no slot sets reads as unset
 */
export const registriesOf = (
	shapeStyleDefaults: ObjectShapeStyleDefaultsRegistry = createObjectShapeStyleDefaultsRegistry(),
	textStyleDefaults: ObjectTextStyleDefaultsRegistry = createObjectTextStyleDefaultsRegistry(),
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
	return {
		objectStyle,
		objectShapeStyleDefaults: shapeStyleDefaults,
		objectTextStyleDefaults: textStyleDefaults,
	};
};

/**
 * The context one entry is called with, outside any walk.
 *
 * @param overrides - What this case cares about; the rest is a selected target, empty defaults registries and no open editor
 */
export const contextOf = (
	overrides: Partial<StyleContext> = {},
): StyleContext => ({
	selected: true,
	shapeStyleDefaults: createObjectShapeStyleDefaultsRegistry(),
	textStyleDefaults: createObjectTextStyleDefaultsRegistry(),
	textEditRange: null,
	...overrides,
});

/**
 * A range naming the body slot of one object, as the walks hand it to an entry.
 *
 * @param objectId - The object being edited
 * @param start - First selected offset, in UTF-16 code units
 * @param end - First offset past the selection
 * @param slotId - The slot being edited; the single-body id by default
 */
export const rangeOf = (
	objectId: string,
	start: number,
	end: number,
	slotId = BODY_TEXT_SLOT_ID,
): TextEditRange => ({ objectId, slotId, start, end });
