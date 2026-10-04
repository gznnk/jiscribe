import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";

import { PART_ADDRESS_SEPARATOR } from "./partAddress";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * What an object type tells core about one namespace of its sub-parts — the
 * vertices of a polyline, the cells of a table. Core knows nothing of what an
 * id means: it carries the id around and hands it back to the type through this
 * definition. A type declares these through `ObjectTypeDefinition.partKinds`, one
 * entry per `kind`; a `features.text === "slots"` type is given the `"textSlot"`
 * kind on top of what it declares (applyObjectDefinition).
 */
export type ObjectPartKindDefinition<TState extends ObjectState = ObjectState> =
	{
		/**
		 * The part-id namespace this entry answers for: "textSlot", "vertex",
		 * "cell". Holds no `:`, that being the separator of the DOM addresses the
		 * parts carry (partAddress).
		 */
		kind: string;

		/**
		 * Whether `partId` still names a part of `object` — the staleness check core
		 * runs before acting on a selection the object may have outgrown (a vertex
		 * index left over from an undo, a removed row).
		 */
		has: (object: TState, partId: string) => boolean;

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
 * Types that register nothing have no sub-parts: nothing of theirs can be
 * selected one level below the object (reconcileObjectPartSelection), and
 * deletion falls through to the object as a whole.
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
	 *   second would silently shadow the first, and so does a kind holding `:`,
	 *   which would collide with the separator of a part's DOM address
	 */
	register<TState extends ObjectState>(
		type: ObjectType,
		parts: ObjectPartKindDefinition<TState>[],
	): void {
		const byKind = new Map<string, ObjectPartKindDefinition>();
		for (const part of parts) {
			if (part.kind.includes(PART_ADDRESS_SEPARATOR)) {
				throw new Error(
					`Object part kind "${part.kind}" holds "${PART_ADDRESS_SEPARATOR}", the separator of a part address`,
				);
			}
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
