import { ContextMenuHandler } from "./ContextMenuHandler";
import { ObjectMenuHandler } from "./ObjectMenuHandler";
import { StencilCategoryToggleHandler } from "./StencilCategoryToggleHandler";
import { StencilLibraryItemHandler } from "./StencilLibraryItemHandler";
import { ToolbarHandler } from "./ToolbarHandler";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { ICanvasRegistries } from "../../../registries/ICanvasRegistries";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { isPerTargetInteraction } from "../utils/isPerTargetInteraction";

/**
 * Sub-handlers of the "menu" targetKind, exported for the exclusivity test.
 */
export const MENU_HANDLERS: readonly GestureHandler[] = [
	StencilLibraryItemHandler,
	StencilCategoryToggleHandler,
	ToolbarHandler,
	ContextMenuHandler,
	ObjectMenuHandler,
];

/**
 * Main handler for all menu-level events.
 * Routes each event to the first sub-handler whose supports() accepts it. The
 * sub-handlers split on targetId (stencil-library / stencil-category / toolbar
 * / context-menu / object-menu) and are mutually exclusive, so the array order
 * never decides routing.
 */
export const MenuEventHandler: GestureHandler = {
	supports(event: CanvasEvent): boolean {
		return event.targetKind === "menu" && isPerTargetInteraction(event);
	},

	handle(
		state: CanvasControllerState,
		event: CanvasEvent,
		registries: ICanvasRegistries,
	): CanvasControllerState {
		for (const handler of MENU_HANDLERS) {
			if (handler.supports(event)) {
				return handler.handle(state, event, registries);
			}
		}

		// Events no sub-handler claims (an unknown targetId) pass through
		return state;
	},
};
