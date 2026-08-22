import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";

import type { ObjectState } from "../../../states/objects/base/ObjectState";

/**
 * Which handles a type puts on the transform frame of a single selection.
 *
 * Scoped to the handles alone: the selection outline, snapping, the marquee and
 * every bounding-box consumer keep treating the shape as the box it is, so
 * turning a handle off costs nothing elsewhere (unlike `features.transform`,
 * which drops rotation/scale from the state and makes `isTransformedFrame`
 * false). A type whose size is derived from its own content turns `resize` off
 * so the handles cannot contradict the derivation.
 */
export type ObjectTransformHandles = {
	/**
	 * Which resize handles are drawn. Omitted = all eight. `"width"` draws the
	 * left and right ones alone: they move a vertical edge only, so they are the
	 * pair a box may offer while its height stays derived from its own content.
	 */
	resize?: boolean | "width";
	/** Whether the rotation knob is drawn. Omitted = drawn. */
	rotate?: boolean;
};

/** {@link ObjectTransformHandles} with both omissions decided (see resolveTransformHandles). */
export type ResolvedTransformHandles = Required<ObjectTransformHandles>;

/**
 * What a type declares as its handles: one answer for every object of it, or a
 * function asked per object. The second form exists for a type whose objects do
 * not all take the same handles — a `text` measured in both directions offers
 * none, and one wrapping in a stored width offers the two that change it.
 *
 * A function must hand back one of a fixed set of values rather than a freshly
 * built object: `TransformControls` is memoized on the declaration it is given,
 * so a new object per call would re-render the frame on every canvas update.
 */
export type ObjectTransformHandlesDeclaration<
	TState extends ObjectState = ObjectState,
> = ObjectTransformHandles | ((state: TState) => ObjectTransformHandles);

/**
 * Per-type registry of transform-handle declarations. Types without a
 * registered declaration get every handle (see resolveTransformHandles).
 */
export class ObjectTransformHandlesRegistry {
	private readonly declarations = new Map<
		ObjectType,
		ObjectTransformHandlesDeclaration
	>();

	register(type: ObjectType, handles: ObjectTransformHandlesDeclaration): void {
		this.declarations.set(type, handles);
	}

	get(type: ObjectType): ObjectTransformHandlesDeclaration | undefined {
		return this.declarations.get(type);
	}

	/**
	 * The declaration that applies to one object, its type's function form
	 * already asked of it.
	 *
	 * @param object - The object the frame is drawn around; only its type and whatever that type's own function reads are looked at
	 * @returns The type's declaration, or undefined when it registered none — which means every handle
	 */
	resolve(object: ObjectState): ObjectTransformHandles | undefined {
		const declaration = this.declarations.get(object.type);
		return typeof declaration === "function"
			? declaration(object)
			: declaration;
	}

	clear(): void {
		this.declarations.clear();
	}
}

export const createObjectTransformHandlesRegistry =
	(): ObjectTransformHandlesRegistry => new ObjectTransformHandlesRegistry();

/**
 * Decides which handles the transform frame draws for one object type.
 *
 * @param handles - Per-type declaration from ObjectTransformHandlesRegistry. Omitted, or with either flag omitted, means that handle is drawn
 * @returns Both flags decided; both `false` means the frame has nothing left to draw and the caller should render no controls at all
 */
export const resolveTransformHandles = (
	handles?: ObjectTransformHandles,
): ResolvedTransformHandles => ({
	resize: handles?.resize ?? true,
	rotate: handles?.rotate ?? true,
});
