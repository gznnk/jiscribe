import type {
	ObjectDoc,
	ObjectDocDefinition,
	ObjectFeatures,
	ObjectPartKindDefinition,
	ObjectState,
	ObjectTextRegionCalculator,
	ObjectTypeDefinition,
} from "@jiscribe/canvas";
import type { StateRecord } from "@jiscribe/canvas/unstable";
import {
	createFrameBehavior,
	createFrameMapper,
	createFrameStateValidator,
	createTextSlotPartKindDefinition,
	TEXT_SLOT_PART_KIND,
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
	 * Where the shape draws, edits and outlines its text: built into the
	 * `"textSlot"` part kind's `region` (createTextSlotPartKindDefinition) and
	 * appended to `partKinds`, so declaring that kind there as well is refused.
	 * Usually the very calculator `doc.textRegion` declares. Omitted = the whole
	 * box. A `features.text: "label"` type placing its caption itself (beyond a
	 * group marker's tip, in an AWS group's band) passes it together with
	 * `visualBounds`, one without the other being refused; passing neither leaves
	 * the core to place the caption under the box.
	 */
	textRegion?: ObjectTextRegionCalculator<TState>;

	/**
	 * State checks beyond the ones features implies, run last in the type-guard
	 * chain. Returns whether the state is valid; the record it receives has already
	 * passed the id / type / frame checks.
	 */
	isExtraStateValid?: (state: StateRecord) => boolean;
};

/**
 * Refuses a `features.text: "label"` type passing only one of `textRegion` and
 * `visualBounds`: the core takes a caption's placement only as both, so the
 * refusal is made here, naming the parameters as they were given. A
 * `"textSlot"` kind declared in `partKinds` stands for `textRegion`.
 */
const checkLabelTextPlacement = <TState extends ObjectState & TransformedFrame>(
	type: string,
	features: ObjectFeatures,
	textRegion: ObjectTextRegionCalculator<TState> | undefined,
	definition: Pick<
		ObjectTypeDefinition<ObjectDoc, TState>,
		"partKinds" | "visualBounds"
	>,
): void => {
	if (features.text !== "label") {
		return;
	}
	const declaresPlacement =
		textRegion !== undefined ||
		definition.partKinds?.some((part) => part.kind === TEXT_SLOT_PART_KIND) ===
			true;
	const declaresBounds = definition.visualBounds !== undefined;
	if (textRegion !== undefined && !declaresBounds) {
		throw new Error(
			`createFrameObjectDefinition "${type}": features.text "label" passes textRegion without visualBounds; pass both to place the caption, or neither to have it placed under the box`,
		);
	}
	if (declaresBounds && !declaresPlacement) {
		throw new Error(
			`createFrameObjectDefinition "${type}": features.text "label" passes visualBounds without textRegion; pass both to place the caption, or neither to have it placed under the box`,
		);
	}
};

/**
 * The type's part kinds with the text slot kind `textRegion` describes appended,
 * refusing a `"textSlot"` kind already among them: the two would both claim to
 * place the slots, and merging them would hide which one wins.
 */
const appendTextSlotPartKind = <TState extends ObjectState & TransformedFrame>(
	type: string,
	partKinds: ObjectPartKindDefinition<TState>[] | undefined,
	textRegion: ObjectTextRegionCalculator<TState> | undefined,
): ObjectPartKindDefinition<TState>[] | undefined => {
	if (textRegion === undefined) {
		return partKinds;
	}
	if (partKinds?.some((part) => part.kind === TEXT_SLOT_PART_KIND)) {
		throw new Error(
			`createFrameObjectDefinition "${type}": declares textRegion and a "${TEXT_SLOT_PART_KIND}" part kind; place the slots on the part kind alone`,
		);
	}
	return [
		...(partKinds ?? []),
		createTextSlotPartKindDefinition<TState>({ region: textRegion }),
	];
};

/**
 * Builds the whole {@link ObjectTypeDefinition} of a Frame-family shape
 * (`geometry: "rect"` + `transform`) from its doc definition and its renderer:
 * mapper / state validator / behavior are derived from `doc.features`, the doc
 * definition is spread whole (its `textRegion` and `autoHeight` included, which
 * is what the auto-height verdict reads, and its `outline` / `anchorRegion`, which
 * the canvas has no field of its own for), `textRegion` becomes the `"textSlot"`
 * part kind, and every other UI-side field (`visualBounds` / `stencils` / `menu`
 * …) is passed through untouched. Replaces the per-shape
 * `*Mapper.ts` / `validate*State.ts` pair.
 *
 * Declaring an `ObjectTypeDefinition` by hand stays supported — this is sugar, and
 * a shape that needs a behavior of its own (not the shared frame one) declares the
 * definition itself.
 *
 * @param params - `doc` and `component` are required; the rest is the optional
 *   part of `ObjectTypeDefinition` plus `textRegion` and the derivation hook (see
 *   {@link FrameObjectDefinitionParams})
 * @throws When `textRegion` is given and `partKinds` already holds a `"textSlot"` kind, or when a `features.text: "label"` type is given only one of `textRegion` and `visualBounds`, naming the type
 */
export const createFrameObjectDefinition = <
	TDoc extends ObjectDoc,
	TState extends ObjectState & TransformedFrame & { type: TDoc["type"] },
>({
	doc,
	textRegion,
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

	checkLabelTextPlacement(features.type, features, textRegion, definition);

	return {
		...doc,
		// The shape's own field names come from the doc definition, which is where they
		// are declared once for the mapper and doc-ops alike.
		mapper: createFrameMapper<TDoc, TState>(features, doc.extraKeys),
		stateValidator: createFrameStateValidator(features, isExtraStateValid),
		behavior: createFrameBehavior<TState>(),
		...definition,
		partKinds: appendTextSlotPartKind(
			features.type,
			definition.partKinds,
			textRegion,
		),
	};
};
