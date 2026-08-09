import type { ObjectType } from "../../schemas/objects/types/ObjectType";
import type { ObjectState } from "../objects/base/ObjectState";

/**
 * What a resizer needs beyond the object's own state: the drawing context the
 * host owns, which no doc can carry because it is a property of the viewer, not
 * of the document.
 */
export type ObjectContentResizeContext = {
	/**
	 * Family the host draws unstyled text in (`CanvasTheme.fontFamily` /
	 * `docDefaults.fontFamily`). Measuring against another family comes out a few
	 * percent off, which shows up as a box clipping its own last characters.
	 */
	fontFamily: string;
};

/**
 * Re-derives an object's box from the content it holds, for the types whose doc
 * stores no size (`geometry: "point"`). The doc coordinate is the box's top-left
 * corner, so an implementation grows the box right and down and leaves that
 * corner where it was (see GeometryType).
 *
 * Implementations declare the state they accept via `TState`, which
 * `ObjectTypeDefinition` ties to the type's own state; the registry stores the
 * default instantiation.
 *
 * Callers run this on every frame of every gesture, so returning `state` itself
 * when the measurement matches the box it already has is part of the contract:
 * it is what lets them skip the rest of the pass by reference equality.
 */
export type ObjectContentResizer<TState extends ObjectState = ObjectState> = (
	state: TState,
	context: ObjectContentResizeContext,
) => TState;

/**
 * Per-type registry of content resizers. A type with no registered resizer keeps
 * the box its doc stored, which is every type but the point-geometry ones — so
 * the three derivation passes (canvasToState, reconcileObjectContentSizes,
 * graftTextEditDraft) skip it entirely.
 */
export class ObjectContentResizerRegistry {
	private readonly resizers = new Map<ObjectType, ObjectContentResizer>();

	register(type: ObjectType, resizer: ObjectContentResizer): void {
		this.resizers.set(type, resizer);
	}

	get(type: ObjectType): ObjectContentResizer | undefined {
		return this.resizers.get(type);
	}

	clear(): void {
		this.resizers.clear();
	}
}

export const createObjectContentResizerRegistry =
	(): ObjectContentResizerRegistry => new ObjectContentResizerRegistry();
