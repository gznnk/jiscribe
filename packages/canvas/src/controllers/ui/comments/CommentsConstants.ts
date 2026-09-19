/**
 * The identity the comment UI is addressed by, and the sizes both of its
 * surfaces (the ObjectMenu dropdown and the panel beside a marker) are built
 * from.
 */

/**
 * Re-exported from the gesture layer, which is where the handler writing the
 * same id can reach it (see CommentMarkerTarget).
 */
export {
	COMMENT_MARKER_TARGET_KIND,
	COMMENTS_SECTION_ID,
} from "../../gestures/handlers/comments/CommentMarkerTarget";

/** Width of the panel (px), the same on both placements. */
export const COMMENT_PANEL_WIDTH = 320;

/** Height of the panel's header and footer rows (px). */
export const COMMENT_PANEL_HEADER_HEIGHT = 36;

/** Tallest the scrolling thread list grows before it scrolls (px). */
export const COMMENT_PANEL_BODY_MAX_HEIGHT = 420;

/** Width of the marker's pin (px); fixed on screen, so unaffected by zoom. */
export const COMMENT_MARKER_WIDTH = 24;

/** Height of the marker's pin (px). */
export const COMMENT_MARKER_HEIGHT = 24;

/** Gap between the bottom of the marker and the object's top edge (px). */
export const COMMENT_MARKER_GAP_Y = 6;

/** Gap between the marker and the panel opened beside it (px). */
export const COMMENT_MARKER_PANEL_GAP = 8;

/** Minimum margin the marker-placed panel keeps from the canvas area's edges (px). */
export const COMMENT_PANEL_VIEWPORT_MARGIN = 8;

/**
 * Avatar backgrounds, one per writer. Hues taken from `PRESET_COLORS`
 * (indigo / teal / amber / pink / violet / sky) and spelled out here rather
 * than imported, so the comments folder never reaches into the ObjectMenu —
 * the dependency runs the other way (CommentsMenu draws the panel).
 */
export const COMMENT_AVATAR_COLORS: readonly string[] = [
	"#6366f1",
	"#14b8a6",
	"#f59e0b",
	"#ec4899",
	"#8b5cf6",
	"#0ea5e9",
];
