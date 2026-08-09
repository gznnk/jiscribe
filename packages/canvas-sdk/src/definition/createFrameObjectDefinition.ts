import type {
	ObjectDoc,
	ObjectDocDefinition,
	ObjectFeatures,
	ObjectState,
	ObjectTypeDefinition,
} from "@jiscribe/canvas";
import type { StateRecord } from "@jiscribe/canvas/unstable";
import {
	createFrameBehavior,
	createFrameMapper,
	createFrameStateValidator,
} from "@jiscribe/canvas/unstable";
import type { TransformedFrame } from "@jiscribe/geometry";

/** Arguments of {@link createFrameObjectDefinition}. */
export type FrameObjectDefinitionParams<
	TDoc extends ObjectDoc,
	TState extends ObjectState & TransformedFrame & { type: TDoc["type"] },
> = Omit<
	ObjectTypeDefinition<TDoc, TState>,
	keyof ObjectDocDefinition | "mapper" | "stateValidator" | "behavior"
> & {
	/**
	 * The shape's headless definition, usually from `createFrameObjectDoc` in
	 * `@jiscribe/canvas-sdk/doc`. Spread into the result, and its `features` is
	 * what the mapper and the state validator are derived from.
	 */
	doc: ObjectDocDefinition;

	/**
	 * Doc fields the mapper carries over unchanged on top of the ones features
	 * implies (a shape-specific field such as the sticky's `variant`). Order does
	 * not matter; unknown keys are simply absent from the result.
	 */
	extraKeys?: readonly string[];

	/**
	 * State checks beyond the ones features implies, run last in the type-guard
	 * chain. Returns whether the state is valid; the record it receives has already
	 * passed the id / type / frame checks.
	 */
	isExtraStateValid?: (state: StateRecord) => boolean;
};

/**
 * Builds the whole {@link ObjectTypeDefinition} of a Frame-family shape
 * (`geometry: "rect"` + `transform`) from its doc definition and its renderer:
 * mapper / state validator / behavior are derived from `doc.features`, and every
 * other UI-side field (`textRegion` / `outline` / `visualBounds` / `stencils` /
 * `menu` …) is passed through untouched. Replaces the per-shape `*Mapper.ts` /
 * `validate*State.ts` pair.
 *
 * Declaring an `ObjectTypeDefinition` by hand stays supported — this is sugar, and
 * a shape that needs a behavior of its own (not the shared frame one) declares the
 * definition itself.
 *
 * @param params - `doc` and `component` are required; the rest is the optional
 *   part of `ObjectTypeDefinition` plus the two derivation hooks (see
 *   {@link FrameObjectDefinitionParams})
 */
export const createFrameObjectDefinition = <
	TDoc extends ObjectDoc,
	TState extends ObjectState & TransformedFrame & { type: TDoc["type"] },
>({
	doc,
	extraKeys,
	isExtraStateValid,
	...definition
}: FrameObjectDefinitionParams<TDoc, TState>): ObjectTypeDefinition<
	TDoc,
	TState
> => {
	// ObjectDocDefinition widens `features`; the frame helpers are keyed to this
	// shape's own type and rect/ellipse geometry.
	const features = doc.features as ObjectFeatures & {
		type: TDoc["type"];
		geometry: "rect" | "ellipse";
	};

	return {
		...doc,
		mapper: createFrameMapper<TDoc, TState>(features, extraKeys),
		stateValidator: createFrameStateValidator(features, isExtraStateValid),
		behavior: createFrameBehavior<TState>(),
		...definition,
	};
};
