/**
 * Enum-like type defining all available diagram component types.
 * Categorized into basic shapes and specialized node types.
 */
export type DiagramType =
	// Shapes
	| "ConnectLine"
	| "ConnectPoint"
	| "Ellipse"
	| "Group"
	| "HtmlPreview"
	| "Image"
	| "Path"
	| "PathPoint"
	| "Rectangle"
	| "Svg"
	| "Text"
	| "Frame"
	| "Button"
	| "Input"
	| "NodeHeader"
	// Diagrams
	| "Ai"
	| "CanvasFrame"
	| "Sticky"
	// Nodes
	| "AgentNode"
	| "HtmlGenNode"
	| "HubNode"
	| "ImageGenNode"
	| "LLMNode"
	| "PageDesignNode"
	| "SvgToDiagramNode"
	| "TextAreaNode"
	| "VectorStoreNode"
	| "WebSearchNode";
