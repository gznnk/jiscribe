import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import { applyTextVerticalBasis } from "@jiscribe/doc/text/block/applyTextVerticalBasis";
import type { Dimensions, Rect, TransformedFrame } from "@jiscribe/geometry";
import { isTransformedFrame } from "@jiscribe/geometry";

import type { ObjectPartSelection } from "../CanvasSelection";
import type { TextSlotRegionCalculators } from "./ObjectTextRegionCalculatorTypes";
import type { ObjectPartKindDefinition } from "../../../rendering/objects/registry/ObjectPartKindRegistry";
import { TEXT_SLOT_PART_KIND } from "../../../rendering/objects/registry/ObjectPartKindRegistry";
import { calcFullTextRegion } from "../../../rendering/objects/utils/calcTextRegion";
import type { ObjectState } from "../../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../../states/objects/base/TextStyleState";
import { isTextStyleState } from "../../../states/objects/base/TextStyleState";
import type { TextSlots } from "../../../states/objects/types/TextSlots";
import { TEXT_STYLE_INTENT_KINDS } from "../../style/StyleIntent";

export { TEXT_SLOT_PART_KIND };

/**
 * Whether what is picked one level below the object is a text slot. Core
 * registers this one kind for every text slot there is, so comparing the name is
 * the definition itself rather than a lookup standing in for one.
 *
 * @param part - The parts picked one level below the object
 *   (`CanvasSelection.part`), taken as it stands (the reducer has already
 *   dropped one naming something gone, reconcileSelection); null when
 *   none are
 * @returns True only while a slot is picked; false when nothing is picked below
 *   the object, or what is picked is of another kind (a vertex)
 */
export const isTextSlotPart = (
	part: ObjectPartSelection | null,
): part is ObjectPartSelection =>
	part !== null && part.kind === TEXT_SLOT_PART_KIND;

/** The object's slots, or undefined when it carries no keyed text at all. */
const readTextSlots = (object: ObjectState): TextSlots | undefined =>
	isTextStyleState(object) ? object.text : undefined;

/** hasOwnProperty rather than a lookup: "toString" names an Object.prototype member on every slot map, and a slot is not that. */
const holdsTextSlot = (slots: TextSlots | undefined, partId: string): boolean =>
	slots !== undefined && Object.prototype.hasOwnProperty.call(slots, partId);

/**
 * The `textSlot` part definition every type with `features.text` gets, its
 * slots taking the whole box (see the overload taking calculators).
 *
 * @returns A definition to register under {@link TEXT_SLOT_PART_KIND}
 */
export function createTextSlotPartKindDefinition<
	TState extends ObjectState = ObjectState,
>(): ObjectPartKindDefinition<TState>;
/**
 * The `textSlot` part definition every type with `features.text` gets, with
 * part ids spelled as the keys of the object's own `text` — the id half of
 * the `data-part` its slot elements carry (textSlotPart). applyObjectDefinition
 * registers one without the type saying anything; a type declares its own (in
 * `ObjectTypeDefinition.partKinds`) to place its slots or to add what core cannot
 * derive.
 *
 * A pick of it receives the text kinds alone (TEXT_STYLE_INTENT_KINDS),
 * reaches the slots it covers, and takes slots apart from one another
 * (`multiPick`).
 *
 * The calculators go on `region` / `regions` as given. Registration wraps them
 * (placeTextSlotRegions), which is where the full-box fallback and the vertical
 * basis come in, so the registered kind's box is the one the renderer and the
 * text editor place the text in.
 *
 * @param calculators - Where the type places its slots: `region` one slot at a
 *   time, `regions` every slot in one call. Neither gives every slot the whole
 *   box, as the overload taking nothing does
 * @returns A definition to register under {@link TEXT_SLOT_PART_KIND}, where it
 *   replaces the automatic registration when a type puts it in its own
 *   `ObjectTypeDefinition.partKinds`
 * @throws When `calculators` declares both `region` and `regions`, which would
 *   leave the two answering for the same slot
 */
export function createTextSlotPartKindDefinition<
	TState extends ObjectState & Dimensions,
>(
	calculators: TextSlotRegionCalculators<TState>,
): ObjectPartKindDefinition<TState>;
export function createTextSlotPartKindDefinition<
	TState extends ObjectState & Dimensions,
>(
	calculators: TextSlotRegionCalculators<TState> = {},
): ObjectPartKindDefinition<TState> {
	const { region, regions } = calculators;
	if (region !== undefined && regions !== undefined) {
		throw new Error(
			`The "${TEXT_SLOT_PART_KIND}" part kind takes region or regions, not both`,
		);
	}
	const textSlotKind: ObjectPartKindDefinition<TState> = {
		kind: TEXT_SLOT_PART_KIND,

		has: (object, partId) => holdsTextSlot(readTextSlots(object), partId),

		// The key order is the order the type stacks its slots in (see the mappers),
		// which is what Tab walks and a range runs along.
		list: (object) => Object.keys(readTextSlots(object) ?? {}),

		multiPick: true,

		styleIntentKinds: TEXT_STYLE_INTENT_KINDS,

		textSlotIds: (_object, partIds) => partIds,
	};
	if (region !== undefined) {
		textSlotKind.region = region;
	}
	if (regions !== undefined) {
		textSlotKind.regions = regions;
	}
	return textSlotKind;
}

/** A text-holding object with a transformed box: the only kind whose slots have a place. */
type TextHoldingFrame = ObjectState & TextStyleState & TransformedFrame;

/** Whether the object holds keyed text and has a transformed box; false for one lacking either. */
const isTextHoldingFrame = (value: ObjectState): value is TextHoldingFrame =>
	isTextStyleState(value) && isTransformedFrame(value);

/**
 * The region a batch answer holds for `slotId`, throwing when it holds none: the
 * slot was enumerated from `object.text`, so a missing key is an invariant broken
 * upstream, and any stand-in rectangle would draw the text somewhere plausible
 * and hide the breakage as a layout bug.
 */
const readBatchTextRegion = (
	type: ObjectType,
	textSlotRegions: Readonly<Record<string, Rect>>,
	slotId: string,
): Rect => {
	if (!Object.prototype.hasOwnProperty.call(textSlotRegions, slotId)) {
		throw new Error(
			`The "${TEXT_SLOT_PART_KIND}" part kind of type "${type}" answers no region for text slot "${slotId}" (it answers ${Object.keys(textSlotRegions).join(", ") || "none"})`,
		);
	}
	return textSlotRegions[slotId];
};

/**
 * The text slot kind a type registers, with `region` / `regions` answering the
 * box each slot is drawn, edited and outlined in: the kind's own calculators
 * (whichever it declares, the other derived from it; `region` answers from its
 * own and `regions` from its own where it declares both), or the whole box when
 * it declares neither, with the object's `textVerticalBasis` applied on top. Every
 * reader of a slot's place goes through the registered kind, so this is the one
 * spot the basis is applied on the canvas side.
 *
 * @param type - The type being registered; named when a batch answer leaves a slot out
 * @param textSlotKind - The kind it registers: the one it declared in `partKinds`, or createTextSlotPartKindDefinition's; its `region` / `regions` are taken as the raw placement, before the basis
 * @returns The kind with `region` — null for a slot the object does not hold or an object that is not a transformed frame — and `regions`, keyed by every key of `object.text` in its order, empty for an object that is not a transformed frame
 * @throws From `region` / `regions` when the kind's own `region` or `regions` answers no region for a slot the object holds: the slot exists, so a stand-in box would hide the breakage
 */
export const placeTextSlotRegions = <TState extends ObjectState>(
	type: ObjectType,
	textSlotKind: ObjectPartKindDefinition<TState>,
): ObjectPartKindDefinition<TState> => {
	const declaredRegion = textSlotKind.region;
	const declaredRegions = textSlotKind.regions;

	// The kind's own answer for one slot before the basis, preferring the
	// one-slot calculator so a slot is never laid out alongside every other.
	const readRawTextRegion = (
		object: TState & TextHoldingFrame,
		slotId: string,
	): Rect => {
		if (declaredRegion !== undefined) {
			const textRegion = declaredRegion(object, slotId);
			if (textRegion === null) {
				throw new Error(
					`The "${TEXT_SLOT_PART_KIND}" part kind of type "${type}" answers no region for text slot "${slotId}" it holds`,
				);
			}
			return textRegion;
		}
		if (declaredRegions !== undefined) {
			return readBatchTextRegion(type, declaredRegions(object), slotId);
		}
		return calcFullTextRegion(object);
	};

	return {
		...textSlotKind,
		region: (object, partId) => {
			if (!isTextHoldingFrame(object) || !holdsTextSlot(object.text, partId)) {
				return null;
			}
			return applyTextVerticalBasis(
				readRawTextRegion(object, partId),
				object,
				object.textVerticalBasis,
			);
		},
		regions: (object) => {
			if (!isTextHoldingFrame(object)) {
				return {};
			}
			const slotIds = Object.keys(object.text ?? {});
			// Asked once for every slot, which is the point of declaring it.
			const batchRegions = declaredRegions?.(object);
			const textSlotRegions: Record<string, Rect> = {};
			for (const slotId of slotIds) {
				const rawTextRegion =
					batchRegions === undefined
						? readRawTextRegion(object, slotId)
						: readBatchTextRegion(type, batchRegions, slotId);
				textSlotRegions[slotId] = applyTextVerticalBasis(
					rawTextRegion,
					object,
					object.textVerticalBasis,
				);
			}
			return textSlotRegions;
		},
	};
};
