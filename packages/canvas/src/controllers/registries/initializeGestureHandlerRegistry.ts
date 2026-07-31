import type { CanvasRegistries } from "./CanvasRegistries";
import { CanvasEventHandler } from "../gestures/handlers/canvas/CanvasEventHandler";
import { ConnectionAnchorEventHandler } from "../gestures/handlers/controls/connection/ConnectionAnchorEventHandler";
import { ConnectorVertexInsertHandler } from "../gestures/handlers/controls/connection/ConnectorVertexInsertHandler";
import { ControlEventHandler } from "../gestures/handlers/controls/ControlEventHandler";
import { TransformControlHandler } from "../gestures/handlers/controls/transform/TransformControlHandler";
import { VertexControlHandler } from "../gestures/handlers/controls/vertex/VertexControlHandler";
import { VertexInsertHandler } from "../gestures/handlers/controls/vertex/VertexInsertHandler";
import { ContextMenuHandler } from "../gestures/handlers/menu/ContextMenuHandler";
import { ObjectMenuHandler } from "../gestures/handlers/menu/ObjectMenuHandler";
import { StencilCategoryToggleHandler } from "../gestures/handlers/menu/StencilCategoryToggleHandler";
import { StencilLibraryItemHandler } from "../gestures/handlers/menu/StencilLibraryItemHandler";
import { ToolbarHandler } from "../gestures/handlers/menu/ToolbarHandler";
import { ConnectorEventHandler } from "../gestures/handlers/objects/ConnectorEventHandler";
import { ConnectorLabelDragHandler } from "../gestures/handlers/objects/ConnectorLabelDragHandler";
import { ConnectorSegmentDragHandler } from "../gestures/handlers/objects/ConnectorSegmentDragHandler";
import { ObjectEventHandler } from "../gestures/handlers/objects/ObjectEventHandler";

/**
 * Initialize the GestureHandlerRegistry with all gesture handlers.
 * Registers handlers for canvas, object, and control events.
 *
 * The handlers' supports() are mutually exclusive: each requires its own
 * targetKind (and targetId for menus) plus the left button, and only
 * CanvasEventHandler takes right-button events. The one shared targetKind is
 * "connector", split among three handlers by event type and data-part: taps go
 * to ConnectorEventHandler, drags on the label box to ConnectorLabelDragHandler,
 * and drags on a "segment:<i>" band to ConnectorSegmentDragHandler. Registration
 * order therefore never decides routing; the exclusivity is pinned by
 * initializeGestureHandlerRegistry.exclusivity.test.ts (#110).
 *
 * Gesture handlers are object-type independent, so `createCanvasRegistries`
 * always registers all of them regardless of the configured object types.
 *
 * @param registries Target bundle to populate.
 */
export const initializeGestureHandlerRegistry = (
	registries: CanvasRegistries,
): void => {
	const gestureHandlerRegistry = registries.gestureHandler;
	gestureHandlerRegistry.clear();

	// Create control strategies
	const transformControlHandler = new TransformControlHandler();
	const vertexControlHandler = new VertexControlHandler();
	const vertexInsertHandler = new VertexInsertHandler();
	const connectionAnchorEventHandler = new ConnectionAnchorEventHandler();
	const connectorVertexInsertHandler = new ConnectorVertexInsertHandler();
	// Future: const pathControlHandler = new PathControlHandler();

	// Instantiate ControlEventHandler with the strategy array.
	// The selectionControl registry instance is stable here even though its
	// contents are registered later (applyObjectDefinition), so per-type
	// selection controls resolve at event time.
	const controlEventHandler = new ControlEventHandler(
		[
			transformControlHandler,
			vertexControlHandler,
			vertexInsertHandler,
			connectionAnchorEventHandler,
			connectorVertexInsertHandler,
			// Future: pathControlHandler,
		],
		registries.selectionControl,
	);

	gestureHandlerRegistry
		.register("stencil-library-item-handler", StencilLibraryItemHandler)
		.register("stencil-category-toggle-handler", StencilCategoryToggleHandler)
		.register("toolbar-handler", ToolbarHandler)
		.register("context-menu-handler", ContextMenuHandler)
		.register("object-menu-handler", ObjectMenuHandler)
		.register("canvas-handler", CanvasEventHandler)
		.register("connector-label-drag-handler", ConnectorLabelDragHandler)
		.register("connector-segment-drag-handler", ConnectorSegmentDragHandler)
		.register("connector-handler", ConnectorEventHandler)
		.register("object-handler", ObjectEventHandler)
		.register("control-handler", controlEventHandler);
};
