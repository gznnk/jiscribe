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
 * Entries render unconditionally — whether or not an object of that type is
 * currently on the canvas — so a reference never resolves against a node torn
 * down by the last instance being deleted. Restricting `objectTypes` still drops
 * the contribution, since the type is then never applied.
 *
 * SVG element ids are document-global and cannot be scoped by the registry, so
 * contributions must prefix theirs with their own type (`sticky-blur`).
 */
export class ObjectSvgDefsRegistry {
	private readonly entries: ObjectSvgDefsEntry[] = [];

	register(type: ObjectType, Component: FC): void {
		this.entries.push({ type, Component });
	}

	/** All contributions in registration order (built-ins first, then plugins in declared order). */
	all(): readonly ObjectSvgDefsEntry[] {
		return [...this.entries];
	}

	clear(): void {
		this.entries.length = 0;
	}
}

export const createObjectSvgDefsRegistry = (): ObjectSvgDefsRegistry =>
	new ObjectSvgDefsRegistry();
