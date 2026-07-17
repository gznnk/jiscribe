import type { CanvasEvent, GestureHandler } from "./GestureHandlerTypes";
import type { CanvasControllerState } from "../../CanvasTypes";
import type { ICanvasRegistries } from "../../setup/ICanvasRegistries";

/**
 * Base class for control-level strategies (resize, vertex, header height, …).
 * Purely a nominal marker: the private brand member makes the class nominal,
 * so only subclasses are assignable — a plain GestureHandler cannot be
 * registered into ControlEventHandler by mistake. Routing is done by each
 * strategy's supports() (data-part matching), not by this class.
 */
export abstract class ControlStrategy implements GestureHandler {
	/** Nominal brand (`declare` = no runtime emit; `private` = blocks structural fakes). */
	declare private readonly controlStrategyBrand: void;

	abstract supports(event: CanvasEvent): boolean;

	abstract handle(
		state: CanvasControllerState,
		event: CanvasEvent,
		registries: ICanvasRegistries,
	): CanvasControllerState;
}
