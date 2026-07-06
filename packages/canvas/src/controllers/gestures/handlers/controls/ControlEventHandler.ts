import type { CanvasControllerState } from "../../../CanvasTypes";
import { commitTextEditIfNeeded } from "../../../utils/commitTextEditIfNeeded";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";

/**
 * A control strategy is a GestureHandler that handles a specific control type.
 * Each strategy exposes the control type it handles via the `controlType` property.
 *
 * Examples: TransformControlHandler (controlType: "transform-control")
 *           PathControlHandler (controlType: "path-control")
 */
export type ControlStrategy = GestureHandler & {
	readonly controlType: string;
};

/**
 * Main handler for all control-level events.
 * Manages control strategies in a Map and routes events to the appropriate
 * strategy based on the control type.
 *
 * Usage:
 * ```typescript
 * const handler = new ControlEventHandler([
 *   transformControlHandler,
 *   pathControlHandler,
 * ]);
 * ```
 */
export class ControlEventHandler implements GestureHandler {
	private strategies = new Map<string, ControlStrategy>();

	/**
	 * Creates a new ControlEventHandler with the given strategies.
	 *
	 * @param strategies - Array of control strategy handlers to register
	 *
	 * Each strategy must:
	 * 1. Implement the GestureHandler interface
	 * 2. Have a controlType property to identify itself
	 */
	constructor(strategies: ControlStrategy[]) {
		// Register all strategies
		for (const strategy of strategies) {
			this.strategies.set(strategy.controlType, strategy);
		}
	}

	supports(event: CanvasEvent): boolean {
		// Left button only: other buttons fall through to CanvasEventHandler's
		// canvas-level right-button behavior (#110)
		return event.targetKind === "control" && event.button === 0;
	}

	handle(
		state: CanvasControllerState,
		event: CanvasEvent,
	): CanvasControllerState {
		// Commit text editing if active
		let nextState = commitTextEditIfNeeded(state);

		// Close the context menu on a press over a control.
		// (Controls are normally unreachable while the menu is open, but this keeps
		//  behavior consistent across the per-target handlers.)
		if (event.type === "pressed") {
			nextState = { ...nextState, contextMenuPosition: null };
		}

		// Try each strategy and use the first one whose supports() returns true
		for (const strategy of this.strategies.values()) {
			if (strategy.supports(event)) {
				return strategy.handle(nextState, event);
			}
		}

		// If no strategy handles the event, return the state unchanged
		return nextState;
	}
}
