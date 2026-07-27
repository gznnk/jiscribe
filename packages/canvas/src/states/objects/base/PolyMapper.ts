import type { ObjectMapperType } from "./MapperTypes";
import { ObjectMapper } from "./ObjectMapper";
import type { ObjectState } from "./ObjectState";
import type { TextDocFields } from "./TextSlotsMapper";
import { mapTextDocToState, mapTextStateToDoc } from "./TextSlotsMapper";
import type { TextStyleState } from "./TextStyleState";
import type { ObjectDoc } from "../../../schemas/objects/base/ObjectDoc";
import type { ObjectFeatures } from "../../../schemas/objects/types/ObjectFeatures";
import { collectStyleKeys, pick } from "../utils/stylePassthrough";

/**
 * Generates a Doc↔State mapper from `features` for Poly-family objects
 * (shapes with geometry: "poly" — connector / polyline / polygon).
 *
 * The Poly counterpart to `createFrameMapper`. Unlike Frame shapes, the geometry here is a
 * plain `points` array that shares its name and type between Doc and State, so no geometry
 * conversion is needed — `points` is passed through directly. Everything else (stroke / fill …)
 * also shares names, so this mapper passes it through by **explicitly picking via an allow-list**;
 * the one exception is the text group, which mapText* rebuilds because its styling sits flat on a
 * `"body"` Doc but inside each slot in the State (only for types with features.text).
 *
 * The picked keys are the style groups enabled in `features` (`collectStyleKeys`, bound to their
 * types via `exhaustiveKeysOf` — adding a field to e.g. StrokeStyleDoc is a compile error until the
 * key constant is updated, after which the field flows through automatically) plus shape-specific
 * `extraKeys` (connector's source/target/routing/arrows/label, polyline's arrows). Because it is an
 * allow-list, runtime-only fields cannot structurally leak into the Doc.
 *
 * @param features - Feature descriptor (must have geometry: "poly").
 * @param extraKeys - Shape-specific field names to pass through (non-style groups).
 */
export const createPolyMapper = <
	TDoc extends ObjectDoc,
	TState extends ObjectState,
>(
	features: ObjectFeatures,
	extraKeys: readonly string[] = [],
): ObjectMapperType<TDoc, TState> => {
	const passthroughKeys = [...collectStyleKeys(features), ...extraKeys];

	return {
		toState: (doc) =>
			({
				...ObjectMapper.toState(doc),
				...pick(doc as unknown as Record<string, unknown>, passthroughKeys),
				...mapTextDocToState(features.text, doc as TextDocFields),
				// points holds the shape's waypoints; identical between Doc and State.
				// Connector's Doc-side points is optional (intermediate waypoints only), so an
				// absent value is normalized to [] to keep State.points always present.
				points: (doc as unknown as { points?: unknown }).points ?? [],
			}) as unknown as TState,

		toDoc: (state) =>
			({
				...ObjectMapper.toDoc(state),
				...pick(state as unknown as Record<string, unknown>, passthroughKeys),
				...mapTextStateToDoc(features.text, (state as TextStyleState).text),
				points: (state as unknown as { points: unknown }).points,
			}) as unknown as TDoc,
	};
};
