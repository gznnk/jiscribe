/**
 * How far the canvas may be scrolled, set once at mount through
 * `initialConfig.scrollBounds`.
 *
 * The limit applies to the deliberate view scrolls only — the wheel and the grab
 * pan. Zooming stays unrestricted (zooming out past the range still shows the
 * empty area around it), and so does every other way the view moves; a view left
 * outside the range that way scrolls back at its own pace rather than snapping.
 */
export type ScrollBoundsConfig = {
	/**
	 * `"infinite"` (the default when the whole setting is omitted) leaves the
	 * canvas unbounded; `"content"` limits panning to the extent of the objects
	 * currently in the doc, so an empty doc is unbounded either way.
	 */
	mode: "infinite" | "content";
	/**
	 * Margin in world units kept outside the content extent (default `100`, four
	 * cells of the default grid). Ignored when `mode` is `"infinite"`. `0` puts
	 * the wall exactly on the outermost object's edge, which leaves that object
	 * flush against the window edge.
	 */
	padding?: number;
};
