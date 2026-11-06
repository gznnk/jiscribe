import type { ObjectMigration } from "./ObjectMigration";

/**
 * A `verticalAlign` on a caption sized from its own text, from before a `"label"`
 * text was held to the typography it can use (`textStyleKeysOf`), or before the
 * type became a `"label"` one: dropped, the caption's box being sized from its
 * text and leaving the block nowhere to move. It was drawn the same whatever it
 * said, so nothing on screen changes.
 */
export const migrateLabelVerticalAlign: ObjectMigration = (
	node,
	path,
	features,
) => {
	if (features.text !== "label" || !("verticalAlign" in node)) {
		return { node, warnings: [] };
	}
	const { verticalAlign: _verticalAlign, ...rest } = node;
	return {
		node: rest,
		warnings: [
			{
				path: `${path}.verticalAlign`,
				message: `verticalAlign is not taken by type "${features.type}", whose label is sized from its own text: it is dropped, and the next save writes the object without it.`,
				severity: "warning",
			},
		],
	};
};
