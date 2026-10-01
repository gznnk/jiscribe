import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { Rect } from "@jiscribe/geometry";

import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * What an object type tells core about one namespace of its sub-parts — the
 * vertices of a polyline, the cells of a table. Core knows nothing of what an
 * id means: it carries the id around and hands it back to the type through this
 * definition. A type declares these through `ObjectTypeDefinition.partKinds`, one
 * entry per `kind`.
 */
export type ObjectPartKindDefinition<TState extends ObjectState = ObjectState> =
	{
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
		 * The parts a range from `anchorPartId` to `focusPartId` covers, for a kind
		 * whose parts are not laid out in one line — a table's cells, where the run is
		 * the rectangle the two corners span rather than the slice of `list` between
		 * them. Omitted = the linear default (collectObjectPartRange over `list`),
		 * which is what a sequence of vertices or of tracks wants.
		 *
		 * Every returned id must be a part the object currently holds, given in the
		 * type's own order — the order the writes and reads that follow walk them in.
		 * An empty list is not an answer: a range covers at least the focus, which is
		 * what an undecidable anchor collapses to.
		 */
		range?: (
			object: TState,
			anchorPartId: string,
			focusPartId: string,
		) => readonly string[];

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
		 * Omitted entirely means Delete is not about this kind of part: with one of
		 * them picked, the key keeps meaning what it means for the object as a whole.
		 * A kind that wants the key held over a picked part, and nothing removed,
		 * declares a deletion that always refuses (`() => null`).
		 */
		delete?: (object: TState, partIds: readonly string[]) => TState | null;
	};

/**
 * Per-type registry of sub-part definitions, keyed by `(type, kind)`.
 * Types that register nothing have no sub-parts, and every part-aware seam
 * (selection, overlay, delete) is inert for them.
 */
export class ObjectPartKindRegistry {
	private readonly entries = new Map<
		ObjectType,
		Map<string, ObjectPartKindDefinition>
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
		parts: ObjectPartKindDefinition<TState>[],
	): void {
		const byKind = new Map<string, ObjectPartKindDefinition>();
		for (const part of parts) {
			if (byKind.has(part.kind)) {
				throw new Error(`Duplicate object part kind "${part.kind}"`);
			}
			byKind.set(part.kind, part as unknown as ObjectPartKindDefinition);
		}
		this.entries.set(type, byKind);
	}

	/**
	 * @param type - The object type to look under
	 * @param kind - The part-id namespace, as the definition spelled it
	 * @returns The definition, or undefined when the type declares no such kind
	 */
	get(type: ObjectType, kind: string): ObjectPartKindDefinition | undefined {
		return this.entries.get(type)?.get(kind);
	}

	clear(): void {
		this.entries.clear();
	}
}

export const createObjectPartKindRegistry = (): ObjectPartKindRegistry =>
	new ObjectPartKindRegistry();
