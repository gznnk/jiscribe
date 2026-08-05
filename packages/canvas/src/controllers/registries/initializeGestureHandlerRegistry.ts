import type { CanvasRegistries } from "./CanvasRegistries";
import { CanvasEventHandler } from "../gestures/handlers/canvas/CanvasEventHandler";
import { ConnectionAnchorEventHandler } from "../gestures/handlers/controls/connection/ConnectionAnchorEventHandler";
import { ConnectorVertexInsertHandler } from "../gestures/handlers/controls/connection/ConnectorVertexInsertHandler";
import { ControlEventHandler } from "../gestures/handlers/controls/ControlEventHandler";
import { TransformControlHandler } from "../gestures/handlers/controls/transform/TransformControlHandler";
import { VertexControlHandler } from "../gestures/handlers/controls/vertex/VertexControlHandler";
import { VertexInsertHandler } from "../gestures/handlers/controls/vertex/VertexInsertHandler";
import { MenuEventHandler } from "../gestures/handlers/menu/MenuEventHandler";
import { ConnectorEventHandler } from "../gestures/handlers/objects/ConnectorEventHandler";
import { ObjectEventHandler } from "../gestures/handlers/objects/ObjectEventHandler";

/**
 * Initialize the GestureHandlerRegistry with all gesture handlers.
 * The registry holds one handler per targetKind: canvas, connector, object,
 * control, and menu.
 *
 * Every per-target router's supports() gates on its own targetKind plus
 * isPerTargetInteraction (the left button, tap/drag types), and only
 * CanvasEventHandler takes middle- and right-button events and touch long
 * presses whatever they land on. Exclusivity at the registry level is therefore
 * structural and registration order never decides routing; the invariant is
 * pinned by initializeGestureHandlerRegistry.exclusivity.test.ts (#110).
 * Sub-routing by targetId, data-part, or event type is each router's own
 * concern.
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
		.register("canvas-handler", CanvasEventHandler)
		.register("connector-handler", ConnectorEventHandler)
		.register("object-handler", ObjectEventHandler)
		.register("control-handler", controlEventHandler)
		.register("menu-handler", MenuEventHandler);
};
