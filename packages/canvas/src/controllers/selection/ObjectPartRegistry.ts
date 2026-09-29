import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { Rect } from "@jiscribe/geometry";

import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * What an object type tells core about one namespace of its sub-parts (see
 * {@link ObjectPartSelection}). A type declares these through
 * `ObjectTypeDefinition.parts`, one entry per `kind`.
 */
export type ObjectPartDefinition<TState extends ObjectState = ObjectState> = {
	/** The part-id namespace this entry answers for: "textSlot", "vertex", "cell". */
	kind: string;

	/**
	 * Whether `partId` still names a part of `object` — the staleness check core
	 * runs before acting on a selection the object may have outgrown (a vertex
	 * index left over from an undo, a removed row).
	 */
	has: (object: TState, partId: string) => boolean;

	/**
	 * The part's box in the object's local coordinates, for the overlay that
	 * draws a selected part; null for a part that occupies no area. Omitted = the
	 * kind is never outlined.
	 */
	region?: (object: TState, partId: string) => Rect | null;

	/**
	 * Every part id the object currently holds, in the order Tab walks them.
	 * Omitted = the kind cannot be cycled through.
	 */
	list?: (object: TState) => readonly string[];

	/**
	 * The text slots the named parts cover, for a kind that stands for a group of
	 * slots without being one itself — a table's row over the cells of that row.
	 * It is what lets a slot-level write (a cell's background, the typography)
	 * land on exactly the slots the pick stands for, and what the menus read the
	 * shown value back off (resolveSelectedTextSlotIds).
	 *
	 * Omitted entirely means the kind covers no slot, which leaves a slot-level
	 * write where it was: on every slot of the object, the reading of nothing
	 * being picked below it (resolveAddressedTextSlotIds). That is right for a
	 * kind that names something other than text — a vertex, a callout's tail.
	 * Never declared for `"textSlot"`, whose ids are slot ids already.
	 *
	 * Every id is guaranteed to have passed `has`, and the slots come back in the
	 * order the write and the read then walk them in — the type's own.
	 */
	textSlotIds?: (
		object: TState,
		partIds: readonly string[],
	) => readonly string[];

	/**
	 * Removes the named parts and returns the changed object, or null to refuse
	 * this one deletion while keeping the state as it stands (a polyline already
	 * at its vertex floor). Every id is guaranteed to have passed `has`.
	 *
	 * Omitted entirely means the kind is never deletable, which is what lets
	 * Delete fall through to whatever it means for the object as a whole.
	 */
	delete?: (object: TState, partIds: readonly string[]) => TState | null;
};

/**
 * Per-type registry of sub-part definitions, keyed by `(type, kind)`.
 * Types that register nothing have no sub-parts, and every part-aware seam
 * (selection, overlay, delete) is inert for them.
 */
export class ObjectPartRegistry {
	private readonly entries = new Map<
		ObjectType,
		Map<string, ObjectPartDefinition>
	>();

	/**
	 * Replaces everything registered for `type`.
	 *
	 * @param type - The object type these parts belong to
	 * @param parts - One entry per `kind`; a repeated kind throws, since the
	 *   second would silently shadow the first
	 */
	register<TState extends ObjectState>(
		type: ObjectType,
		parts: ObjectPartDefinition<TState>[],
	): void {
		const byKind = new Map<string, ObjectPartDefinition>();
		for (const part of parts) {
			if (byKind.has(part.kind)) {
				throw new Error(`Duplicate object part kind "${part.kind}"`);
			}
			byKind.set(part.kind, part as unknown as ObjectPartDefinition);
		}
		this.entries.set(type, byKind);
	}

	/**
	 * @param type - The object type to look under
	 * @param kind - The part-id namespace, as the definition spelled it
	 * @returns The definition, or undefined when the type declares no such kind
	 */
	get(type: ObjectType, kind: string): ObjectPartDefinition | undefined {
		return this.entries.get(type)?.get(kind);
	}

	clear(): void {
		this.entries.clear();
	}
}

export const createObjectPartRegistry = (): ObjectPartRegistry =>
	new ObjectPartRegistry();
