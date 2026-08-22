import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";

/**
 * Which types a document may leave `height` out of, its height then following
 * the text (`supportsAutoHeight`). Registered from each type's own declarations
 * (`supportsAutoHeightType`) so the canvas offers the switch exactly where the
 * parser accepts the resulting document, and read by the two sides that offer
 * it: the menu section and the command behind it.
 *
 * A type absent from here keeps the height its doc stores, which is every type
 * that draws its label outside its outline, divides its box into bands, or
 * stores no height at all.
 */
export class ObjectAutoHeightRegistry {
	private readonly types = new Set<ObjectType>();

	register(type: ObjectType): void {
		this.types.add(type);
	}

	/**
	 * Whether this type's height may follow its text.
	 *
	 * @param type - The object type; an unregistered one answers false
	 */
	supports(type: ObjectType): boolean {
		return this.types.has(type);
	}

	clear(): void {
		this.types.clear();
	}
}

export const createObjectAutoHeightRegistry = (): ObjectAutoHeightRegistry =>
	new ObjectAutoHeightRegistry();
