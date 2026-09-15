/**
 * Width (world px) of the mark drawn in the middle of a placeholder. Fixed
 * rather than proportional, so it reads the same on a thumbnail-sized box as on
 * a full-width one; a box narrower than this draws no mark at all.
 */
export const IMAGE_PLACEHOLDER_MARK_WIDTH = 24;

/** Height (world px) of that mark; a box shorter than this draws no mark either. */
export const IMAGE_PLACEHOLDER_MARK_HEIGHT = 18;

const halfMarkWidth = IMAGE_PLACEHOLDER_MARK_WIDTH / 2;
const halfMarkHeight = IMAGE_PLACEHOLDER_MARK_HEIGHT / 2;

/** The mark itself, centered on the origin: a picture frame with a slash across it. */
export const IMAGE_PLACEHOLDER_MARK_PATH = [
	`M ${-halfMarkWidth} ${-halfMarkHeight}`,
	`H ${halfMarkWidth}`,
	`V ${halfMarkHeight}`,
	`H ${-halfMarkWidth}`,
	"Z",
	`M ${-halfMarkWidth} ${halfMarkHeight}`,
	`L ${halfMarkWidth} ${-halfMarkHeight}`,
].join(" ");
