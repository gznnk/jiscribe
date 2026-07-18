import type { ShapeFactoryRegistry } from "../../schemas/registry/ShapeFactoryRegistry";
import type { ObjectMapperRegistry } from "../../states/registry/ObjectMapperRegistry";
import type { CanvasControllerState } from "../CanvasTypes";
import type { ObjectBehaviorRegistry } from "../gestures/registry/ObjectBehaviorRegistry";
import type { ShapePresetRegistry } from "../registry/ShapePresetRegistry";

/**
 * The registry contract passed as an argument to the pure reducer/handler tree
 * (commands' `execute`/`canExecute`, gesture handlers' `handle`, `handleCommand`).
 *
 * Structured to keep the dependency graph acyclic: the recursive `command`
 * registry is described by an **inline structural shape** (not the concrete
 * `CommandRegistry` / `Command`), so `CommandTypes` / `GestureHandlerTypes` can
 * reference this contract without it importing them back — structural typing binds
 * the real classes at the bundle-construction site instead (#165).
 *
 * The concrete `CanvasRegistries` bundle is structurally assignable to this
 * contract, so callers pass their real bundle where an `ICanvasRegistries` is
 * expected.
 */
export interface ICanvasRegistries {
	objectMapper: ObjectMapperRegistry;
	objectBehavior: ObjectBehaviorRegistry;
	shapeFactory: ShapeFactoryRegistry;
	shapePreset: ShapePresetRegistry;
	/**
	 * Command lookup, used by `handleCommand` (reached from the menu/context/toolbar
	 * gesture handlers). Inline shape — mirrors what the pure tree calls on the
	 * command registry — so this contract does not import `CommandRegistry`/`Command`.
	 */
	command: {
		get(commandId: string): CommandLike | undefined;
	};
	/**
	 * Styleable-property update dispatch, used by the object-menu gesture handler
	 * and the reducer's MENU_PROPERTY_UPDATE. Inline shape for the same acyclicity
	 * reason as `command` (the concrete class is `StylePropertyRegistry`).
	 */
	styleProperty: {
		apply(
			state: CanvasControllerState,
			property: string,
			value: string,
		): CanvasControllerState;
	};
}

/** The slice of a `Command` the pure tree invokes (structural; not the `Command` type). */
type CommandLike = {
	canExecute(
		state: CanvasControllerState,
		registries: ICanvasRegistries,
	): boolean;
	/** Optional: absent on callback-executed commands (see `Command.execute`). */
	execute?(
		state: CanvasControllerState,
		registries: ICanvasRegistries,
	): CanvasControllerState;
};
