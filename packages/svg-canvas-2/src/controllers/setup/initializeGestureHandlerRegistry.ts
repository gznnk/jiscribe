import { gestureHandlerRegistry } from "../../registry/GestureHandlerRegistry";
import { CanvasEventHandler } from "../gestures/handlers/canvas/CanvasEventHandler";
import { ControlEventHandler } from "../gestures/handlers/controls/ControlEventHandler";
import { TransformControlHandler } from "../gestures/handlers/controls/transform/TransformControlHandler";
import { ObjectEventHandler } from "../gestures/handlers/objects/ObjectEventHandler";

/**
 * Initialize the GestureHandlerRegistry with all gesture handlers.
 * Registers handlers for canvas, object, and control events.
 */
export const initializeGestureHandlerRegistry = (): void => {
	gestureHandlerRegistry.clear();

	// コントロールストラテジの作成
	const transformControlHandler = new TransformControlHandler();
	// 将来: const pathControlHandler = new PathControlHandler();

	// ControlEventHandler をストラテジ配列でインスタンス化
	const controlEventHandler = new ControlEventHandler([
		transformControlHandler,
		// 将来: pathControlHandler,
	]);

	gestureHandlerRegistry
		.register("canvas-handler", CanvasEventHandler)
		.register("object-handler", ObjectEventHandler)
		.register("control-handler", controlEventHandler);
};
