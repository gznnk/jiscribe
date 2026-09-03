/**
 * Selector constants built on the canvas DOM contract (data-kind / data-id / data-part, with
 * data-testid for test-only hooks). See "DOM structure and selectors" in e2e/README.md.
 */

/**
 * Tool name in the left toolbar, matching the button's title attribute. The
 * listed ones are core's own presets, spelled out as known values for
 * completion; a plugin's tool name (its stencil label, "Sticky" say) is equally
 * accepted.
 */
export type ToolTitle =
	"Rectangle" | "Ellipse" | "Polyline" | "Polygon" | "Text" | (string & {});

/** Edge midpoint anchor, the four every connectable shape has. */
export type EdgeAnchorId =
	"topCenter" | "bottomCenter" | "leftCenter" | "rightCenter";

/**
 * Id of a connector attachment anchor: one of the edge midpoints core gives every
 * connectable shape, or a point a shape type declares for itself
 * (`extraConnectPoints`, such as the brace's "tip"), whose id only that type knows.
 */
export type AnchorId = EdgeAnchorId | (string & {});

/**
 * Section id that opens a color picker in the ObjectMenu. The listed ones are
 * core's built-in menu items, spelled out as known values for completion; a
 * section a plugin's own menu declares ("header-color" say) is equally accepted.
 */
export type ColorSectionId =
	"bg-color" | "stroke-color" | "line-color" | "font-color" | (string & {});

/** Shared by the unscoped and the section-scoped color input selectors below. */
const CSS_COLOR_INPUT = 'input[placeholder="CSS color"]';

export const selectors = {
	/** Toolbar tool button. */
	toolButton: (tool: ToolTitle) => `button[title="${tool}"]`,

	/** The toolbar bar itself; the only element of the bar carrying data-kind / data-id. */
	toolbar: '[data-kind="menu"][data-id="toolbar"]',

	/**
	 * Toolbar command button (zoom and so on). Written as a descendant selector
	 * because the buttons carry only data-part: that mirrors how the gesture
	 * system resolves them (the nearest [data-kind] ancestor supplies kind / id)
	 * and keeps them apart from the `command:*` parts of the other menus.
	 */
	toolbarCommand: (commandId: string) =>
		`[data-kind="menu"][data-id="toolbar"] [data-part="command:${commandId}"]`,

	/** StencilLibrary category button; the toggle that opens a flyout. */
	categoryButton: (categoryId: string) =>
		`[data-id="stencil-category"][data-part="toggle:${categoryId}"]`,

	/** Category flyout, present only while open. */
	categoryFlyout: (categoryId: string) =>
		`[data-category-flyout="${categoryId}"]`,

	/** StencilLibrary shape item; pinned and in-flyout share this DOM contract. */
	shapeItem: (presetId: string) => `[data-part="item:${presetId}"]`,

	/** Shape on the canvas (rect / ellipse / polyline and so on). */
	object: "[data-kind=object]",

	/**
	 * Ghost preview shown while drag-drawing. It reuses the shape component, so it carries
	 * data-kind=object despite not being a committed shape; exclude its subtree when
	 * enumerating objects so the transient element is not counted.
	 */
	drawingPreview: '[data-testid="drawing-preview"]',

	/** Connector body polyline; the arrowhead polygon carries the same data-kind. */
	connectorPolyline: "polyline[data-kind=connector]",

	/** Every handle shown on selection. */
	control: "[data-kind=control]",

	/** Resize and rotation handles. */
	transformControl: (
		handle:
			| "topLeft"
			| "topCenter"
			| "topRight"
			| "leftCenter"
			| "rightCenter"
			| "bottomLeft"
			| "bottomCenter"
			| "bottomRight"
			| "rotation",
	) =>
		handle === "rotation"
			? `[data-id="transform"][data-part="rotation"]`
			: `[data-id="transform"][data-part="resize:${handle}"]`,

	/** Connector creation anchor, drawn 20px outside the edge midpoint. */
	createAnchor: (anchorId: AnchorId) => `[data-part="anchor:${anchorId}"]`,

	/** The floating ObjectMenu container itself, not the buttons inside (they carry the same data attributes). */
	objectMenu: 'div[data-kind="menu"][data-id="object-menu"]:not([data-part])',

	/** Toggle button that opens an ObjectMenu dropdown. */
	objectMenuToggle: (sectionId: string) => `[data-part="toggle:${sectionId}"]`,

	/** ObjectMenu button that applies at once, such as a preset color or line style. */
	objectMenuSet: (property: string, value: string) =>
		`[data-part="set:${property}:${value}"]`,

	/**
	 * FontFamilyMenu entry, by CanvasFontFamilyId. Its own attribute rather than
	 * `objectMenuSet`, whose value would be the font stack — quotes and commas an
	 * attribute selector cannot carry.
	 */
	objectMenuFont: (fontId: string) =>
		`[data-id="object-menu"][data-font="${fontId}"]`,

	/** ObjectMenu command button, such as bringToFront for z-order. */
	objectMenuCommand: (commandId: string) =>
		`[data-part="command:${commandId}"][data-id="object-menu"]`,

	/** ObjectMenu slider; a range input whose value changes by dragging. */
	objectMenuSlider: (property: string) => `[data-part="slider:${property}"]`,

	/** CSS color text input in the color picker, committed with Enter. */
	cssColorInput: CSS_COLOR_INPUT,

	/**
	 * CSS color text input of one named section, scoped through the positioner that
	 * holds both the section's toggle and its panel. Gesture events are processed one
	 * animation frame after the click, so the section being closed keeps its own input
	 * in the DOM until that frame lands; scoping makes a locator wait for the panel
	 * that belongs to the section instead of matching the outgoing one.
	 */
	objectMenuColorInput: (sectionId: string) =>
		`div:has(> [data-part="toggle:${sectionId}"]) ${CSS_COLOR_INPUT}`,

	/** TEXTAREA shown while editing text. */
	textEditor: '[data-testid="text-editor"]',

	/** Every context-menu item, command and callback alike; used to test for appearance. */
	contextMenuAny:
		'[data-id="context-menu"], [data-testid^="context-menu-callback:"]',

	/** Context-menu command item, such as bring-to-front or duplicate. */
	contextMenuCommand: (commandId: string) =>
		`[data-id="context-menu"][data-part="command:${commandId}"]`,

	/** Context-menu callback item, such as paste. */
	contextMenuCallback: (id: string) =>
		`[data-testid="context-menu-callback:${id}"]`,
} as const;
