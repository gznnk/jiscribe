import type { ObjectDocDefinition } from "./ObjectDocDefinition";

/**
 * What {@link supportsAutoHeight} reads off a type: its features and its
 * `autoHeight` denial. A whole `ObjectDocDefinition` is one; so is the
 * `{ features, autoHeight }` a definition is being assembled from, which is how
 * a doc validator asks before its definition exists.
 */
export type AutoHeightDeclaration = Pick<
	ObjectDocDefinition,
	"features" | "autoHeight"
>;

/**
 * Whether a type's `height` may be left out of the document, the height then
 * following the text it holds (`calcAutoShapeHeight`).
 *
 * True for a type that stores a `height` at all (`geometry: "rect"`), carries one
 * body of text as `"body"` — laid out inside its box, in the region the type
 * declares (`ObjectDocDefinition.textRegion`, which such a type must declare) —
 * and has not denied it (`ObjectDocDefinition.autoHeight: false`). A
 * caption (`"label"` / `"innerLabel"`), sized from its own text rather than the box, a type
 * dividing its box into slots, and one storing no height have nothing to derive
 * a height from, so their `height` stays required. So does a `text: "source"`
 * shape: its body is not drawn by the shared text layout, so a height measured
 * from the source as wrapped plain text is not the height it is drawn at.
 *
 * @param definition - The type's declarations (see {@link AutoHeightDeclaration}); nothing outside them is read, so the answer is a fact about the type
 * @returns True when the document may omit `height` for this type
 */
export const supportsAutoHeight = (
	definition: AutoHeightDeclaration,
): boolean => {
	const { features, autoHeight } = definition;
	return (
		features.geometry === "rect" &&
		features.text === "body" &&
		autoHeight !== false
	);
};
