/**
 * The stencil rail, the column of shape tools at the left of the canvas, as a
 * host configures it through the `rail` Canvas prop. What else the rail shows is
 * not configured here: the pinned categories are the user's pins (seeded by
 * `CanvasConfig.pinnedCategoryIds`, changed from the catalog), the categories
 * after them follow the open document (useDocumentCategoryIds), and the catalog
 * button follows `stencilLibrary.sections`.
 */
export type CanvasRailConfig = {
	/**
	 * Whether to render the rail (default `true`). Independent of
	 * `toolbar.show`: hiding the toolbar leaves the rail, and hiding the rail
	 * leaves the toolbar. `false` takes away every way of starting a new shape by
	 * hand, short of a host button running `toggleStencilLibrary`.
	 */
	show?: boolean;
	/**
	 * The presets placed at the top of the rail, in order, each placed by click or
	 * drag the way a library item is. Their types are left out of what the
	 * document's categories count (see buildCategoryIdsByObjectType). Omit for {@link DEFAULT_RAIL_PRESET_IDS},
	 * which holds core's primitives only; a plugin preset shows only when named
	 * here. An id naming no registered preset (a plugin the host did not apply) is
	 * skipped; naming one id twice throws, since the id keys the button.
	 */
	presetIds?: readonly string[];
};

/**
 * The rail's presets when the host names none: core's primitives, area → line →
 * text. Exported for a host that adds its own presets after them.
 */
export const DEFAULT_RAIL_PRESET_IDS: readonly string[] = [
	"rect",
	"ellipse",
	"polygon",
	"polyline",
	"text",
];
