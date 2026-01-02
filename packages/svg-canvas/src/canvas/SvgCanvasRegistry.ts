import { StickyAtlas } from "../atlas/diagrams/StickyAtlas";
import { ConnectLineAtlas } from "../atlas/shapes/ConnectLineAtlas";
import { EllipseAtlas } from "../atlas/shapes/EllipseAtlas";
import { GroupAtlas } from "../atlas/shapes/GroupAtlas";
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
	DiagramRegistry.register(ImageAtlas);
	DiagramRegistry.register(PathAtlas);
	DiagramRegistry.register(PathPointAtlas);
	DiagramRegistry.register(RectangleAtlas);
	DiagramRegistry.register(SvgAtlas);

	// ============================================================================
	// Diagram Atlas Registration
	// ============================================================================
	DiagramRegistry.register(StickyAtlas);
};
