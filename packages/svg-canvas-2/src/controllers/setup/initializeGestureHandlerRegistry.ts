import { CanvasEventHandler } from "../gestures/handlers/canvas/CanvasEventHandler";
import { ConnectionAnchorEventHandler } from "../gestures/handlers/controls/connection/ConnectionAnchorEventHandler";
import { ControlEventHandler } from "../gestures/handlers/controls/ControlEventHandler";
import { TransformControlHandler } from "../gestures/handlers/controls/transform/TransformControlHandler";
import { VertexControlHandler } from "../gestures/handlers/controls/vertex/VertexControlHandler";
import { VertexInsertHandler } from "../gestures/handlers/controls/vertex/VertexInsertHandler";
import { ContextMenuHandler } from "../gestures/handlers/menu/ContextMenuHandler";
import { ObjectMenuHandler } from "../gestures/handlers/menu/ObjectMenuHandler";
import { ShapeLibraryItemHandler } from "../gestures/handlers/menu/ShapeLibraryItemHandler";
import { ConnectorEventHandler } from "../gestures/handlers/objects/ConnectorEventHandler";
import { ObjectEventHandler } from "../gestures/handlers/objects/ObjectEventHandler";
import { gestureHandlerRegistry } from "../gestures/registry/GestureHandlerRegistry";

/**
 * Initialize the GestureHandlerRegistry with all gesture handlers.
 * Registers handlers for canvas, object, and control events.
 */
export const initializeGestureHandlerRegistry = (): void => {
	gestureHandlerRegistry.clear();

	// コントロールストラテジの作成
	const transformControlHandler = new TransformControlHandler();
	const vertexControlHandler = new VertexControlHandler();
	const vertexInsertHandler = new VertexInsertHandler();
	const connectionAnchorEventHandler = new ConnectionAnchorEventHandler();
	// 将来: const pathControlHandler = new PathControlHandler();

	// ControlEventHandler をストラテジ配列でインスタンス化
	const controlEventHandler = new ControlEventHandler([
		transformControlHandler,
		vertexControlHandler,
		vertexInsertHandler,
		connectionAnchorEventHandler,
		// 将来: pathControlHandler,
	]);

	gestureHandlerRegistry
		.register("shape-library-item-handler", ShapeLibraryItemHandler)
		.register("context-menu-handler", ContextMenuHandler)
		.register("object-menu-handler", ObjectMenuHandler)
		.register("canvas-handler", CanvasEventHandler)
		.register("connector-handler", ConnectorEventHandler)
		.register("object-handler", ObjectEventHandler)
		.register("control-handler", controlEventHandler);
};
