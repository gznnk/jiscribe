import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";

import type {
	ObjectTextEditLineBreaksResolver,
	TextEditLineBreaks,
} from "./ObjectTextEditLineBreaksTypes";

/**
 * Per-type registry of text-edit line-break resolvers (see
 * {@link ObjectTextEditLineBreaksResolver}). Types without a registered resolver
 * allow line breaks in every slot (see resolveTextEditLineBreaks).
 */
export class ObjectTextEditLineBreaksRegistry {
	private readonly resolvers = new Map<
		ObjectType,
		ObjectTextEditLineBreaksResolver
	>();

	register(type: ObjectType, resolver: ObjectTextEditLineBreaksResolver): void {
		this.resolvers.set(type, resolver);
	}

	get(type: ObjectType): ObjectTextEditLineBreaksResolver | undefined {
		return this.resolvers.get(type);
	}

	clear(): void {
		this.resolvers.clear();
	}
}

export const createObjectTextEditLineBreaksRegistry =
	(): ObjectTextEditLineBreaksRegistry =>
		new ObjectTextEditLineBreaksRegistry();

/**
 * Resolves whether the editor for one slot takes line breaks.
 *
 * @param slotId - The slot being edited; a key of `state.text`
 * @param resolver - Per-type resolver from ObjectTextEditLineBreaksRegistry. Omitted = `"allow"` for every slot
 * @returns The slot's line-break behavior
 */
export const resolveTextEditLineBreaks = (
	slotId: string,
	resolver?: ObjectTextEditLineBreaksResolver,
): TextEditLineBreaks => resolver?.(slotId) ?? "allow";
