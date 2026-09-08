import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";

/**
 * Which types draw their body with a renderer of their own instead of the shared
 * plain-text layout (`textLayout: "own"` on the type's declaration). Registered
 * from each type's own declaration, and read by text measurement: a body laid
 * out as HTML blocks (Markdown) cannot be simulated from the state, so it is
 * measured off the drawn DOM instead.
 *
 * A type absent from here draws plain text, which is every type that does not
 * pass its own overlay renderer.
 */
export class ObjectTextLayoutRegistry {
	private readonly ownLayoutTypes = new Set<ObjectType>();

	register(type: ObjectType): void {
		this.ownLayoutTypes.add(type);
	}

	/**
	 * Whether this type lays its body out itself rather than as plain text.
	 *
	 * @param type - The object type; an unregistered one answers false
	 */
	hasOwnLayout(type: ObjectType): boolean {
		return this.ownLayoutTypes.has(type);
	}

	clear(): void {
		this.ownLayoutTypes.clear();
	}
}

export const createObjectTextLayoutRegistry = (): ObjectTextLayoutRegistry =>
	new ObjectTextLayoutRegistry();
