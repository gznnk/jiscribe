import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";

import type {
	ObjectTextEditOverflowResolver,
	TextEditOverflow,
} from "./ObjectTextEditOverflowTypes";

/**
 * Per-type registry of text-edit overflow resolvers (see
 * {@link ObjectTextEditOverflowResolver}). Types without a registered resolver
 * scroll every slot (see resolveTextEditOverflow).
 */
export class ObjectTextEditOverflowRegistry {
	private readonly resolvers = new Map<
		ObjectType,
		ObjectTextEditOverflowResolver
	>();

	register(type: ObjectType, resolver: ObjectTextEditOverflowResolver): void {
		this.resolvers.set(type, resolver);
	}

	get(type: ObjectType): ObjectTextEditOverflowResolver | undefined {
		return this.resolvers.get(type);
	}

	clear(): void {
		this.resolvers.clear();
	}
}

export const createObjectTextEditOverflowRegistry =
	(): ObjectTextEditOverflowRegistry => new ObjectTextEditOverflowRegistry();

/**
 * Resolves how the editor for one slot handles overflow.
 *
 * @param slotId - The slot being edited; a key of `state.text`
 * @param resolver - Per-type resolver from ObjectTextEditOverflowRegistry. Omitted = `"scroll"` for every slot
 * @returns The slot's overflow behavior
 */
export const resolveTextEditOverflow = (
	slotId: string,
	resolver?: ObjectTextEditOverflowResolver,
): TextEditOverflow => resolver?.(slotId) ?? "scroll";
