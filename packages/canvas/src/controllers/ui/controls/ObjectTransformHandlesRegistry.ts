import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";

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
	/** Whether the eight resize handles are drawn. Omitted = drawn. */
	resize?: boolean;
	/** Whether the rotation knob is drawn. Omitted = drawn. */
	rotate?: boolean;
};

/** {@link ObjectTransformHandles} with both omissions decided (see resolveTransformHandles). */
export type ResolvedTransformHandles = Required<ObjectTransformHandles>;

/**
 * Per-type registry of transform-handle declarations. Types without a
 * registered declaration get every handle (see resolveTransformHandles).
 */
export class ObjectTransformHandlesRegistry {
	private readonly declarations = new Map<ObjectType, ObjectTransformHandles>();

	register(type: ObjectType, handles: ObjectTransformHandles): void {
		this.declarations.set(type, handles);
	}

	get(type: ObjectType): ObjectTransformHandles | undefined {
		return this.declarations.get(type);
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
