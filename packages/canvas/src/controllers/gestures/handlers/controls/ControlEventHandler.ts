import type { ObjectType } from "../../../../schemas/objects/types/ObjectType";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { ICanvasRegistries } from "../../../setup/ICanvasRegistries";
import type { SelectionControlRegistry } from "../../../ui/controls/SelectionControlRegistry";
import { commitTextEditIfNeeded } from "../../../utils/commitTextEditIfNeeded";
import type { ControlStrategy } from "../../registry/ControlStrategy";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { parseSelectionControlObjectType } from "../../registry/SelectionControlHandler";
import { isLeftButton } from "../utils/isLeftButton";

/**
 * Main handler for all control-level events.
 * Routes each event to the first strategy whose supports() accepts it
 * (the strategies' data-part namespaces are mutually exclusive), then falls
 * back to the type-specific selection controls.
 */
export class ControlEventHandler implements GestureHandler {
	private strategies: readonly ControlStrategy[];
	private selectionControls: SelectionControlRegistry | undefined;

	/**
	 * @param strategies - Control strategy handlers, in routing order
	 * @param selectionControls - Per-type selection controls, consulted after
	 *   every static strategy declines the event. The registry instance is
	 *   stable; its contents are filled later by `applyObjectDefinition`.
	 */
	constructor(
		strategies: ControlStrategy[],
		selectionControls?: SelectionControlRegistry,
	) {
		this.strategies = [...strategies];
		this.selectionControls = selectionControls;
	}

	supports(event: CanvasEvent): boolean {
		return event.targetKind === "control" && isLeftButton(event);
	}

	handle(
		state: CanvasControllerState,
		event: CanvasEvent,
		registries: ICanvasRegistries,
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
		for (const strategy of this.strategies) {
			if (strategy.supports(event)) {
				return strategy.handle(nextState, event, registries);
			}
		}

		// Fall back to the type-specific selection controls
		const selectionStrategy = this.resolveSelectionControlStrategy(event);
		if (selectionStrategy) {
			return selectionStrategy.handle(nextState, event, registries);
		}

		// If no strategy handles the event, return the state unchanged
		return nextState;
	}

	/**
	 * Resolves the selection control whose supports() accepts the event.
	 * Selection-control data-parts are self-describing
	 * (`selection:<objectType>:<partName>`), so the object type comes from the
	 * part itself — no state lookup involved.
	 */
	private resolveSelectionControlStrategy(
		event: CanvasEvent,
	): ControlStrategy | undefined {
		if (!this.selectionControls || !event.targetPart) {
			return undefined;
		}
		const objectType = parseSelectionControlObjectType(event.targetPart);
		if (!objectType) {
			return undefined;
		}
		// The parsed segment is untrusted DOM text; an unknown type simply
		// misses the registry.
		const controls = this.selectionControls.get(objectType as ObjectType);
		return controls?.find((control) => control.handler.supports(event))
			?.handler;
	}
}
