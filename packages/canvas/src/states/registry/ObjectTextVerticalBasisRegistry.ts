import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";

/**
 * Which types the switch between the two vertical bases actually moves the body
 * of (`hasInsetTextRegion`). Registered from each type's own declarations
 * (`hasInsetTextRegionType`), and read by the two sides that offer the switch:
 * the menu section and the command behind it.
 *
 * A type absent from here lays its text out over its whole height already — a
 * plain box, a bare text — or draws its label outside the box, so both bases
 * would put the body in the same place and the switch would be a control that
 * does nothing.
 */
export class ObjectTextVerticalBasisRegistry {
	private readonly types = new Set<ObjectType>();

	register(type: ObjectType): void {
		this.types.add(type);
	}

	/**
	 * Whether this type's body moves when the basis is switched.
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

export const createObjectTextVerticalBasisRegistry =
	(): ObjectTextVerticalBasisRegistry => new ObjectTextVerticalBasisRegistry();
