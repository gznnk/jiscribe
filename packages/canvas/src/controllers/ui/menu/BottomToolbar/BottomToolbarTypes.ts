/** How the bottom tool bar is drawn: `Canvas`'s `bottomToolbar` prop. */
export type BottomToolbarOptions = {
	/**
	 * Whether to render the bar (default `true`). `false` removes it, presets and
	 * "Other shapes" alike: for read-only hosts (a render harness), or a host
	 * that keeps its presets on the top bar instead.
	 */
	show?: boolean;
	/**
	 * Presets pinned on the bar, in display order (default
	 * `DEFAULT_BOTTOM_TOOLBAR_PRESET_IDS`, core's basic primitives). An id naming
	 * no registered preset (a plugin the host did not apply) is skipped; an
	 * empty array, or one whose ids all name nothing, leaves the "Other shapes"
	 * button alone on the bar. Naming the same id twice throws.
	 */
	presetIds?: readonly string[];
};
