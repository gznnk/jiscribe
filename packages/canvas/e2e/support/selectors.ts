/**
 * Selector constants built on the canvas DOM contract (data-kind / data-id / data-part, with
 * data-testid for test-only hooks). See "DOM structure and selectors" in e2e/README.md.
 */

/** Tool name in the left toolbar, matching the button's title attribute. */
export type ToolTitle =
	| "Rectangle"
	| "Ellipse"
	| "Polyline"
	| "Polygon"
	| "Text"
	| "Sticky"
	| "Markdown";

/** Edge midpoint anchor, the four every connectable shape has. */
export type EdgeAnchorId =
	| "topCenter"
	| "bottomCenter"
	| "leftCenter"
	| "rightCenter";

/**
 * Id of a connector attachment anchor: an edge midpoint, or a point a shape type
 * declares for itself ("tip" on the group markers).
 */
export type AnchorId = EdgeAnchorId | "tip";

/** Section id that opens a color picker in the ObjectMenu. */
export type ColorSectionId =
	| "bg-color"
	| "header-color"
	| "stroke-color"
	| "line-color"
	| "font-color";

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

	/** ObjectMenu command button, such as bringToFront for z-order. */
	objectMenuCommand: (commandId: string) =>
		`[data-part="command:${commandId}"][data-id="object-menu"]`,

	/** ObjectMenu slider; a range input whose value changes by dragging. */
	objectMenuSlider: (property: string) => `[data-part="slider:${property}"]`,

	/** CSS color text input in the color picker, committed with Enter. */
	cssColorInput: 'input[placeholder="CSS color"]',

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
