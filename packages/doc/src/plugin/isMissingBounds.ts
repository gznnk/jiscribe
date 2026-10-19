import type { ObjectDocDefinition } from "./ObjectDocDefinition";

/**
 * What {@link isMissingBounds} reads off a type: the geometry that says whether a
 * box is stored at all, and the declaration that stands in for it when none is. A
 * whole `ObjectDocDefinition` is one, as is the `{ features, bounds }` a definition
 * is being assembled from.
 */
export type BoundsDeclaration = Pick<
	ObjectDocDefinition,
	"features" | "bounds"
>;

/**
 * Whether a type leaves its box unstated: a `geometry: "point"` type, whose doc
 * stores the corner it is drawn from and no size, that declares no
 * `ObjectDocDefinition.bounds` to measure one by. Such a type has no box at all, so
 * every op working off one passes its objects over — reporting bounds, aligning,
 * distributing, finding overlaps.
 *
 * The single statement of that rule, so the places that hold a shape set to it
 * cannot drift: the plugin author's own parse-check suite
 * (`@jiscribe/canvas-sdk/testing`) fails on it, and `diagnoseDoc`
 * (`@jiscribe/doc-tools`) reports it against a document that already holds one.
 *
 * @param definition - The type's declarations (see {@link BoundsDeclaration}); nothing outside them is read, so the answer is a fact about the type
 * @returns True only for a point-geometry type with no box declaration; false for every other geometry, which stores or derives its box some other way
 */
export const isMissingBounds = (definition: BoundsDeclaration): boolean =>
	definition.features.geometry === "point" && definition.bounds === undefined;
