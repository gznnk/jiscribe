import type { ShapeFactoryRegistry } from "../../schemas/registry/ShapeFactoryRegistry";
import type { ObjectMapperRegistry } from "../../states/registry/ObjectMapperRegistry";
import type { CanvasControllerState } from "../CanvasTypes";
import type { ObjectBehaviorRegistry } from "../gestures/registry/ObjectBehaviorRegistry";
import type { ShapePresetRegistry } from "../registry/ShapePresetRegistry";

/**
 * The registry contract passed as an argument to the pure reducer/handler tree
 * (commands' `execute`/`canExecute`, gesture handlers' `handle`, `handleCommand`).
 *
 * Key to keeping the dependency graph acyclic: `CommandTypes` /
 * `GestureHandlerTypes` reference this contract, and this contract references
 * nothing that references them back. The non-recursive registries are referenced
 * by their concrete class type; the recursive `command` registry is described by
 * an **inline structural shape** (not the concrete `CommandRegistry` / `Command`
 * types) so this module never imports them — structural typing binds the real
 * classes at the bundle-construction site instead. `CanvasControllerState` is
 * imported for the command signatures, but the (now pure) state does not import
 * this contract back, so there is no cycle and no module-augmentation hack (#165).
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
}

/** The slice of a `Command` the pure tree invokes (structural; not the `Command` type). */
type CommandLike = {
	canExecute(
		state: CanvasControllerState,
		registries: ICanvasRegistries,
	): boolean;
	execute(
		state: CanvasControllerState,
		registries: ICanvasRegistries,
	): CanvasControllerState;
};
