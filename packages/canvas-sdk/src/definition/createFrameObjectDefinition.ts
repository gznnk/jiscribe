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
	// `textRegion` is excluded from the exclusion: the doc definition declares the
	// region over a doc, and a shape whose UI region is sized from its own text
	// (a below-label caption) passes the UI calculator here.
	| Exclude<keyof ObjectDocDefinition, "textRegion">
	| "mapper"
	| "stateValidator"
	| "behavior"
> & {
	/**
	 * The shape's headless definition, usually from `createFrameObjectDoc` in
	 * `@jiscribe/canvas-sdk/doc`. Spread into the result, and its `features` is
	 * what the mapper and the state validator are derived from.
	 */
	doc: ObjectDocDefinition;

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
	isExtraStateValid,
	...definition
}: FrameObjectDefinitionParams<TDoc, TState>): ObjectTypeDefinition<
	TDoc,
	TState
> => {
	// The doc-side text region answers over a doc and may answer "not in the box
	// at all"; the UI one answers over a state, per slot. Only the latter belongs
	// on the result, so the doc's declaration is dropped rather than spread.
	const { textRegion: _docTextRegion, ...docDefinition } = doc;
	// ObjectDocDefinition widens `features`; the frame helpers are keyed to this
	// shape's own type and rect/ellipse geometry.
	const features = doc.features as ObjectFeatures & {
		type: TDoc["type"];
		geometry: "rect" | "ellipse";
	};

	return {
		...docDefinition,
		// The shape's own field names come from the doc definition, which is where they
		// are declared once for the mapper and doc-ops alike.
		mapper: createFrameMapper<TDoc, TState>(features, doc.extraKeys),
		stateValidator: createFrameStateValidator(features, isExtraStateValid),
		behavior: createFrameBehavior<TState>(),
		...definition,
	};
};
