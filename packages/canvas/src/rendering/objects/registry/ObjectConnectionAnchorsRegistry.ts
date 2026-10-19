import type { ConnectPointId } from "@jiscribe/doc/model/objects/types/EndpointRef";
import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import type { Dimensions } from "@jiscribe/geometry";

import type { ObjectState } from "../../../states/objects/base/ObjectState";

/**
 * How one fixed connection anchor is shown: where its dot sits and whether it
 * is offered at all.
 */
export type ConnectionAnchorSpec = {
	/**
	 * Distance from the edge (or from an extra connect point's declared
	 * position) to the center of the anchor's source dot, in screen px — the
	 * same unit as the theme's `handleDimensions.connectionAnchorOffset`, which
	 * an omitted value falls back to.
	 */
	readonly offset?: number;
	/**
	 * true = the anchor is not offered: no source dot on the selected shape, no
	 * landing dot during a connection drag, and a drop near it does not snap to
	 * it. Omitted = offered. A connector a doc already attaches there still
	 * attaches; an extra point is offered only when `extraConnectPoints`
	 * declares it in the first place.
	 */
	readonly hidden?: boolean;
};

/**
 * Per-anchor display specs. Keys are the edge anchor ids (`topCenter` /
 * `rightCenter` / `bottomCenter` / `leftCenter`) or the ids the type's
 * `extraConnectPoints` declare; anchors left out keep the theme's distance and
 * stay offered. They name local-space anchors, so an entry follows its local
 * edge through rotation and flips.
 */
export type ConnectionAnchors = Readonly<
	Partial<Record<ConnectPointId, ConnectionAnchorSpec>>
> &
	Readonly<Record<string, ConnectionAnchorSpec>>;

/**
 * Calculates a shape's per-anchor display specs from its state, the function
 * form of {@link ObjectConnectionAnchorsDeclaration} for a type whose anchors
 * are not shown the same way on every object of it. Implementations declare
 * what they read via `TState`; the registry stores the default instantiation,
 * to which narrower readers are assignable by contravariance.
 *
 * @param state - The shape's state, untransformed (local width / height). The
 *   theme is not passed in: offsets are absolute screen px, not deltas from the
 *   theme default.
 * @param zoom - Canvas zoom (1 = 100%), for a type whose controls are sized in
 *   world units and so reach further on screen the further it is zoomed in;
 *   multiply a world length by it to get the screen px to return
 * @returns Only the anchors to change; return a shared constant when the answer
 *   depends on neither argument, so the dots' memo holds.
 */
export type ObjectConnectionAnchorsCalculator<
	TState extends ObjectState = ObjectState & Dimensions,
> = (state: TState, zoom: number) => ConnectionAnchors;

/**
 * What a type declares about its fixed connection anchors: one answer for
 * every object of it, or a function asked per object and zoom (see
 * ObjectTransformHandlesDeclaration for the same two forms).
 */
export type ObjectConnectionAnchorsDeclaration<
	TState extends ObjectState = ObjectState & Dimensions,
> = ConnectionAnchors | ObjectConnectionAnchorsCalculator<TState>;

/**
 * Per-type registry of connection-anchor declarations. Types without a
 * registered declaration offer every anchor with its dot at the theme's
 * `connectionAnchorOffset` (see ConnectionAnchors).
 */
export class ObjectConnectionAnchorsRegistry {
	private readonly declarations = new Map<
		ObjectType,
		ObjectConnectionAnchorsDeclaration
	>();

	register(
		type: ObjectType,
		declaration: ObjectConnectionAnchorsDeclaration,
	): void {
		this.declarations.set(type, declaration);
	}

	get(type: ObjectType): ObjectConnectionAnchorsDeclaration | undefined {
		return this.declarations.get(type);
	}

	/**
	 * The anchor specs that apply to one object, its type's function form
	 * already asked of it.
	 *
	 * @param object - The shape the anchors belong to; only its type and whatever that type's own function reads are looked at
	 * @param zoom - Canvas zoom (1 = 100%), handed to the type's function form; the object form ignores it
	 * @returns The type's specs, or undefined when it registered none — which means every anchor offered at the theme's distance
	 */
	resolve(
		object: ObjectState & Dimensions,
		zoom: number,
	): ConnectionAnchors | undefined {
		const declaration = this.declarations.get(object.type);
		return typeof declaration === "function"
			? declaration(object, zoom)
			: declaration;
	}

	clear(): void {
		this.declarations.clear();
	}
}

export const createObjectConnectionAnchorsRegistry =
	(): ObjectConnectionAnchorsRegistry => new ObjectConnectionAnchorsRegistry();
