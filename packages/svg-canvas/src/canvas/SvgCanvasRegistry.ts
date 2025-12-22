import { AiAtlas } from "../atlas/diagrams/AiAtlas";
import { CanvasFrameAtlas } from "../atlas/diagrams/CanvasFrameAtlas";
import { StickyAtlas } from "../atlas/diagrams/StickyAtlas";
import { ButtonAtlas } from "../atlas/elements/ButtonAtlas";
import { InputAtlas } from "../atlas/elements/InputAtlas";
import { NodeHeaderAtlas } from "../atlas/elements/NodeHeaderAtlas";
import { AgentNodeAtlas } from "../atlas/nodes/AgentNodeAtlas";
import { HtmlGenNodeAtlas } from "../atlas/nodes/HtmlGenNodeAtlas";
import { HubNodeAtlas } from "../atlas/nodes/HubNodeAtlas";
import { ImageGenNodeAtlas } from "../atlas/nodes/ImageGenNodeAtlas";
import { LLMNodeAtlas } from "../atlas/nodes/LLMNodeAtlas";
import { PageDesignNodeAtlas } from "../atlas/nodes/PageDesignNodeAtlas";
import { SvgToDiagramNodeAtlas } from "../atlas/nodes/SvgToDiagramNodeAtlas";
import { TextAreaNodeAtlas } from "../atlas/nodes/TextAreaNodeAtlas";
import { VectorStoreNodeAtlas } from "../atlas/nodes/VectorStoreNodeAtlas";
import { WebSearchNodeAtlas } from "../atlas/nodes/WebSearchNodeAtlas";
import { ConnectLineAtlas } from "../atlas/shapes/ConnectLineAtlas";
import { EllipseAtlas } from "../atlas/shapes/EllipseAtlas";
import { GroupAtlas } from "../atlas/shapes/GroupAtlas";
import { HtmlPreviewAtlas } from "../atlas/shapes/HtmlPreviewAtlas";
import { ImageAtlas } from "../atlas/shapes/ImageAtlas";
import { PathAtlas } from "../atlas/shapes/PathAtlas";
import { PathPointAtlas } from "../atlas/shapes/PathPointAtlas";
import { RectangleAtlas } from "../atlas/shapes/RectangleAtlas";
import { SvgAtlas } from "../atlas/shapes/SvgAtlas";
import { DiagramRegistry } from "../registry";

/**
 * Initialize all diagram registrations for the SvgCanvas.
 * This function must be called before using any diagram components.
 */
export const initializeSvgCanvasDiagrams = (): void => {
	// Clear existing registrations to avoid duplicates
	DiagramRegistry.clear();

	// ============================================================================
	// Shape Atlas Registration
	// ============================================================================
	DiagramRegistry.register(ConnectLineAtlas);
	DiagramRegistry.register(EllipseAtlas);
	DiagramRegistry.register(GroupAtlas);
	DiagramRegistry.register(HtmlPreviewAtlas);
	DiagramRegistry.register(ImageAtlas);
	DiagramRegistry.register(PathAtlas);
	DiagramRegistry.register(PathPointAtlas);
	DiagramRegistry.register(RectangleAtlas);
	DiagramRegistry.register(SvgAtlas);

	// ============================================================================
	// Element Atlas Registration
	// ============================================================================
	DiagramRegistry.register(ButtonAtlas);
	DiagramRegistry.register(InputAtlas);
	DiagramRegistry.register(NodeHeaderAtlas);

	// ============================================================================
	// Diagram Atlas Registration
	// ============================================================================
	DiagramRegistry.register(AiAtlas);
	DiagramRegistry.register(CanvasFrameAtlas);
	DiagramRegistry.register(StickyAtlas);

	// ============================================================================
	// Node Atlas Registration
	// ============================================================================
	DiagramRegistry.register(AgentNodeAtlas);
	DiagramRegistry.register(HtmlGenNodeAtlas);
	DiagramRegistry.register(HubNodeAtlas);
	DiagramRegistry.register(ImageGenNodeAtlas);
	DiagramRegistry.register(LLMNodeAtlas);
	DiagramRegistry.register(PageDesignNodeAtlas);
	DiagramRegistry.register(SvgToDiagramNodeAtlas);
	DiagramRegistry.register(TextAreaNodeAtlas);
	DiagramRegistry.register(VectorStoreNodeAtlas);
	DiagramRegistry.register(WebSearchNodeAtlas);
};
