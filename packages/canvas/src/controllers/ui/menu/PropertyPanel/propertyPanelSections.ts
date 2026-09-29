/**
 * Identity of each section `createDefaultPropertyPanel` builds: the id the
 * merge across selected types and the appends after registration match on, and
 * the English wording its message key carries (`resolvePropertyPanelSectionLabel`
 * reads the heading from CanvasMessages by the id; the label is drawn only if a
 * host drops the message). Spelled once here so a row appended to one of these
 * sections lands in it rather than beside it under a heading of its own.
 *
 * The three the panel adds itself (Canvas / Arrange / Meta) are not a type's to
 * declare and stay with PropertyPanel; the connector's label sections stay with
 * its hand-written declaration (applyObjectDefinition).
 */
export const PROPERTY_PANEL_SECTIONS = {
	layout: { id: "layout", label: "Layout" },
	fill: { id: "fill", label: "Fill" },
	stroke: { id: "stroke", label: "Border" },
	line: { id: "line", label: "Line" },
	arrow: { id: "arrow", label: "Arrows" },
	text: { id: "text", label: "Text" },
} as const satisfies Record<string, { id: string; label: string }>;
