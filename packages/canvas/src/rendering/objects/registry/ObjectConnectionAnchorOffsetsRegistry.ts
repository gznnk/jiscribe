import type { ConnectPointId } from "@jiscribe/doc/model/objects/types/EndpointRef";
import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { Dimensions } from "@jiscribe/geometry";

import type { ObjectState } from "../../../states/objects/base/ObjectState";

/**
 * Per-anchor distance from the edge (or from an extra connect point's declared
 * position) to the center of its connection-anchor dot, in screen px — the same
 * unit as the theme's `handleDimensions.connectionAnchorOffset`, which every
 * anchor left out falls back to. Keys are the edge anchor ids (`topCenter` /
 * `rightCenter` / `bottomCenter` / `leftCenter`) or the ids the type's
 * `extraConnectPoints` declare. They name local-space anchors, so an entry
 * follows its local edge through rotation and flips.
 */
export type ConnectionAnchorOffsets = Readonly<
	Partial<Record<ConnectPointId, number>>
> &
	Readonly<Record<string, number>>;

/**
 * Calculates a shape's per-anchor dot distances from its state, the function
 * form of {@link ObjectConnectionAnchorOffsetsDeclaration} for a type whose
 * controls do not sit in the same band on every object of it. Implementations
 * declare what they read via `TState`; the registry stores the default
 * instantiation, to which narrower readers are assignable by contravariance.
 *
 * @param state - The shape's state, untransformed (local width / height). The
 *   theme is not passed in: values are absolute screen px, not deltas from the
 *   theme default.
 * @param zoom - Canvas zoom (1 = 100%), for a type whose controls are sized in
 *   world units and so reach further on screen the further it is zoomed in;
 *   multiply a world length by it to get the screen px to return
 * @returns Only the anchors to move; return a shared constant when the answer
 *   depends on neither argument, so the dots' memo holds.
 */
export type ObjectConnectionAnchorOffsetsCalculator<
	TState extends ObjectState = ObjectState & Dimensions,
> = (state: TState, zoom: number) => ConnectionAnchorOffsets;

/**
 * What a type declares as its dot distances, for a type whose own controls sit
 * in the band the theme's default distance would put the dots in (the table's
 * row / column grips): one answer for every object of it, or a function asked
 * per object (see ObjectTransformHandlesDeclaration for the same two forms).
 */
export type ObjectConnectionAnchorOffsetsDeclaration<
	TState extends ObjectState = ObjectState & Dimensions,
> = ConnectionAnchorOffsets | ObjectConnectionAnchorOffsetsCalculator<TState>;

/**
 * Per-type registry of connection-anchor offset declarations. Types without a
 * registered declaration place every dot at the theme's
 * `connectionAnchorOffset` (see ConnectionAnchors).
 */
export class ObjectConnectionAnchorOffsetsRegistry {
	private readonly declarations = new Map<
		ObjectType,
		ObjectConnectionAnchorOffsetsDeclaration
	>();

	register(
		type: ObjectType,
		declaration: ObjectConnectionAnchorOffsetsDeclaration,
	): void {
		this.declarations.set(type, declaration);
	}

	get(type: ObjectType): ObjectConnectionAnchorOffsetsDeclaration | undefined {
		return this.declarations.get(type);
	}

	/**
	 * The offsets that apply to one object, its type's function form already
	 * asked of it.
	 *
	 * @param object - The shape the dots are drawn on; only its type and whatever that type's own function reads are looked at
	 * @param zoom - Canvas zoom (1 = 100%), handed to the type's function form; the object form ignores it
	 * @returns The type's offsets, or undefined when it registered none — which means the theme's distance for every dot
	 */
	resolve(
		object: ObjectState & Dimensions,
		zoom: number,
	): ConnectionAnchorOffsets | undefined {
		const declaration = this.declarations.get(object.type);
		return typeof declaration === "function"
			? declaration(object, zoom)
			: declaration;
	}

	clear(): void {
		this.declarations.clear();
	}
}

export const createObjectConnectionAnchorOffsetsRegistry =
	(): ObjectConnectionAnchorOffsetsRegistry =>
		new ObjectConnectionAnchorOffsetsRegistry();
