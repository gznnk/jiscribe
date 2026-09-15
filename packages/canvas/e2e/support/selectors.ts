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

/** Shared by the shape library sidebar selectors below, which all scope into it. */
const STENCIL_LIBRARY_PANEL =
	'[data-kind="menu"][data-id="stencil-library-panel"]';

/** Shared by the properties sidebar selectors below, which all scope into it. */
const PROPERTY_PANEL = '[data-kind="menu"][data-id="property-panel"]';

/**
 * Shared by the toolbar-scoped selectors below. Scoping them matters because while
 * the sidebar is open every preset it lists is a second button with the same title
 * and data-part as the pinned one.
 */
const TOOLBAR = '[data-kind="menu"][data-id="toolbar"]';

export const selectors = {
	/** Toolbar tool button, scoped to the bar so the sidebar's copy cannot match. */
	toolButton: (tool: ToolTitle) => `${TOOLBAR} button[title="${tool}"]`,

	/** The toolbar bar itself; the only element of the bar carrying data-kind / data-id. */
	toolbar: TOOLBAR,

	/**
	 * Toolbar command button (zoom and so on). Written as a descendant selector
	 * because the buttons carry only data-part: that mirrors how the gesture
	 * system resolves them (the nearest [data-kind] ancestor supplies kind / id)
	 * and keeps them apart from the `command:*` parts of the other menus.
	 */
	toolbarCommand: (commandId: string) =>
		`${TOOLBAR} [data-part="command:${commandId}"]`,

	/** StencilLibrary category button; the toggle that opens a flyout. */
	categoryButton: (categoryId: string) =>
		`[data-id="stencil-category"][data-part="toggle:${categoryId}"]`,

	/** Category flyout, present only while open. */
	categoryFlyout: (categoryId: string) =>
		`[data-category-flyout="${categoryId}"]`,

	/**
	 * StencilLibrary shape item; pinned and in-flyout share this DOM contract, and
	 * both live inside the toolbar, which is what scopes the sidebar's copy out.
	 */
	shapeItem: (presetId: string) => `${TOOLBAR} [data-part="item:${presetId}"]`,

	/**
	 * Toolbar toggle that opens and closes the shape library sidebar. Present only
	 * when the host declared `stencilLibrary.sections` with something in it, and
	 * carrying the open state on aria-expanded. Written as a descendant selector for
	 * the same reason as toolbarCommand.
	 */
	stencilLibraryToggle: `${TOOLBAR} [data-part="command:toggleStencilLibrary"]`,

	/**
	 * The shape library sidebar itself. Mounted only while open, so closed it is
	 * absent from the DOM: assert `toHaveCount(0)` for closed rather than waiting
	 * for it to become invisible.
	 */
	stencilLibraryPanel: STENCIL_LIBRARY_PANEL,

	/** Close (x) button in the sidebar header. */
	stencilLibraryPanelClose: `${STENCIL_LIBRARY_PANEL} [data-part="close"]`,

	/**
	 * Sidebar section header; the disclosure button carrying aria-expanded, whose
	 * id is the category id the host declared.
	 */
	stencilLibrarySection: (sectionId: string) =>
		`${STENCIL_LIBRARY_PANEL} [data-part="section:${sectionId}"]`,

	/**
	 * Shape item inside the sidebar. Same DOM contract as shapeItem, scoped to the
	 * panel so it does not also match the pinned copy on the toolbar.
	 */
	stencilLibraryPanelItem: (presetId: string) =>
		`${STENCIL_LIBRARY_PANEL} [data-part="item:${presetId}"]`,

	/** Search box of the sidebar; filtering collapses the sections into one grid. */
	stencilLibrarySearch: `${STENCIL_LIBRARY_PANEL} input[type="text"]`,

	/**
	 * Toolbar toggle that opens and closes the properties sidebar, carrying the
	 * open state on aria-expanded. Scoped to the toolbar so it does not also match
	 * the panel's own close button, which routes through the same command.
	 */
	propertyPanelToggle: `${TOOLBAR} [data-part="command:togglePropertyPanel"]`,

	/**
	 * The properties sidebar itself. Mounted only while open, so closed it is
	 * absent from the DOM: assert `toHaveCount(0)` for closed rather than waiting
	 * for it to become invisible.
	 */
	propertyPanel: PROPERTY_PANEL,

	/** Close (x) button in the properties sidebar header. */
	propertyPanelClose: `${PROPERTY_PANEL} [data-part="command:togglePropertyPanel"]`,

	/**
	 * Section header of the properties sidebar; the disclosure button carrying
	 * aria-expanded. Scoped to the panel, since the ObjectMenu's own section
	 * toggles share the `toggle:` grammar.
	 */
	propertyPanelSection: (sectionId: string) =>
		`${PROPERTY_PANEL} [data-part="toggle:${sectionId}"]`,

	/**
	 * A property-writing control inside the sidebar (a swatch, a segment, a
	 * checkbox). The controls declare themselves as object-menu targets, so this
	 * differs from `objectMenuSet` only in being scoped to the panel.
	 */
	propertyPanelSet: (property: string, value: string) =>
		`${PROPERTY_PANEL} [data-part="set:${property}:${value}"]`,

	/** A command button inside the sidebar (the Arrange section's stacking-order buttons). */
	propertyPanelCommand: (commandId: string) =>
		`${PROPERTY_PANEL} [data-part="command:${commandId}"]`,

	/**
	 * A number field of the sidebar, found by its test-only hook: `x` / `y` /
	 * `width` / `height` / `rotation` for the frame, and the style property's own
	 * name for the rest (`strokeWidth`, `rx`, `fontSize`).
	 */
	propertyPanelField: (name: string) =>
		`${PROPERTY_PANEL} [data-testid="property-field:${name}"]`,

	/**
	 * One of the two spin buttons beside a number field. Scoped through the
	 * field's own root (`> ` against the input), so the pair of a Size row does
	 * not also match its neighbour's buttons; the aria-label is the only thing
	 * that tells up from down.
	 */
	propertyPanelFieldSpin: (name: string, direction: "Increase" | "Decrease") =>
		`${PROPERTY_PANEL} div:has(> [data-testid="property-field:${name}"]) button[aria-label="${direction}"]`,

	/**
	 * Title row of the sidebar. Its first child rather than a data-part of its
	 * own: it is the one place inside the panel a press reaches no control, which
	 * is what a test of "pressing outside" needs.
	 */
	propertyPanelHeader: `${PROPERTY_PANEL} > div:nth-child(1)`,

	/**
	 * Scrolling body of the sidebar, the child that holds the sections. The
	 * dropdown panels are portalled to the panel root beside it, so they never
	 * scroll with the rows they cover.
	 */
	propertyPanelBody: `${PROPERTY_PANEL} > div:nth-child(2)`,

	/**
	 * The open panel of a sidebar dropdown field, portalled to the sidebar's root.
	 * Present only while open, so assert `toHaveCount(0)` for closed.
	 */
	propertyPanelDropdown: `${PROPERTY_PANEL} [data-part="panel"]`,

	/** Shape on the canvas (rect / ellipse / polyline and so on). */
	object: "[data-kind=object]",

	/**
	 * Ghost preview shown while drag-drawing. It reuses the shape component, so it carries
	 * data-kind=object despite not being a committed shape; exclude its subtree when
	 * enumerating objects so the transient element is not counted.
	 */
	drawingPreview: '[data-testid="drawing-preview"]',

	/**
	 * Draft connector drawn while one is being pulled from an anchor. It reuses the
	 * connector renderer and already carries the id the commit will use, so exclude
	 * its subtree when enumerating objects or a connector is seen before dragEnd
	 * puts it in the document.
	 */
	pendingConnector: '[data-testid="pending-connector"]',

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
