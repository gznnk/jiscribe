import type { ObjectDocDefinition } from "./ObjectDocDefinition";
import type { ObjectFactory } from "../model/objects/types/ObjectFactory";
import type { PointObjectSizeResolver } from "../model/objects/utils/createPointObjectFactory";

/**
 * The `geometry: "point"` half of a type's {@link ObjectDocDefinition}, built from
 * one resolver: the box the doc-ops measure a saved doc by and the box the factory
 * places a new one at come from the same measurement, so the two cannot disagree.
 * Spread the result into the type's definition.
 *
 * @param pointSize - Measures the box a doc of the type draws; the doc it is handed may state only what the file states or carry the type's defaults, so it resolves what it leans on itself (see {@link ObjectDocDefinition.pointSize})
 * @param buildFactory - Builds the type's factory from that same resolver, normally {@link import("../model/objects/utils/createPointObjectFactory").createPointObjectFactory} with the type's `*_DOC_DEFAULTS`; a point type that is never created programmatically has no factory to build and declares `pointSize` on its own instead
 * @returns The `pointSize` and `factory` fields of the definition, both present
 */
export const declarePointGeometry = (
	pointSize: PointObjectSizeResolver,
	buildFactory: (pointSize: PointObjectSizeResolver) => ObjectFactory,
): Required<Pick<ObjectDocDefinition, "pointSize" | "factory">> => ({
	pointSize,
	factory: buildFactory(pointSize),
});
