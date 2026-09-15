import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { FC } from "react";

/** One registered `<defs>` contribution, paired with the type that declared it. */
export type ObjectSvgDefsEntry = {
	/** Declaring object type; doubles as the React key when rendered. */
	type: ObjectType;
	/** Renders the shared SVG resources (filter / gradient / marker / …). */
	Component: FC;
};

/**
 * Per-type registry of `<defs>` contributions. They render once per canvas
 * inside the single `<defs>` element (see CanvasDefs), not once per object, so a
 * type declares here whatever its instances reference by `url(#…)`.
 *
 * At most one contribution per type: registering a type again replaces what it
 * held, as every other object registry does. Keeping both would emit the same
 * `type` twice in CanvasDefs, where it is the React key — the duplicate costs one
 * of the two subtrees, and the ids the drawn objects point at may be the ones
 * that went missing.
 *
 * Entries render unconditionally — whether or not an object of that type is
 * currently on the canvas — so a reference never resolves against a node torn
 * down by the last instance being deleted. Restricting `objectTypes` still drops
 * the contribution, since the type is then never applied.
 *
 * SVG element ids are document-global and cannot be scoped by the registry, so
 * contributions must prefix theirs with their own type (`sticky-shadow`).
 */
export class ObjectSvgDefsRegistry {
	private readonly entries = new Map<ObjectType, FC>();

	register(type: ObjectType, Component: FC): void {
		this.entries.set(type, Component);
	}

	/**
	 * All contributions in registration order (built-ins first, then plugins in
	 * declared order). A type that is registered again keeps the place it first
	 * took, so what a canvas draws does not depend on how often a type was applied.
	 */
	all(): readonly ObjectSvgDefsEntry[] {
		return [...this.entries].map(([type, Component]) => ({ type, Component }));
	}

	clear(): void {
		this.entries.clear();
	}
}

export const createObjectSvgDefsRegistry = (): ObjectSvgDefsRegistry =>
	new ObjectSvgDefsRegistry();
