import type { CanvasControllerState } from "../CanvasTypes";
import type { ICanvasRegistries } from "../setup/ICanvasRegistries";

/**
 * Definition of a keyboard shortcut.
 */
export type KeyBinding = {
	/**
	 * Physical key code (e.g. "KeyZ", "Delete", "Digit0") — layout-independent.
	 * Used for keys that sit at the same position across JIS/US, such as letter and digit keys.
	 * When code is specified, shift is also checked strictly.
	 */
	code?: string;
	/**
	 * Character key value (e.g. "[", "]", "=", "+") — layout-dependent.
	 * Used for symbol keys whose position differs between JIS/US.
	 * When key is specified, the shift check is skipped (shift is already implied by the character).
	 */
	key?: string;
	/** Ctrl key */
	ctrl?: boolean;
	/** Shift key — effective only for the code-based form */
	shift?: boolean;
	/** Alt key */
	alt?: boolean;
	/** Cmd key (Mac) */
	meta?: boolean;
};

/**
 * Platform-specific keyboard shortcut definitions.
 * Allows different shortcuts for Mac (⌘) and Windows/Linux (Ctrl).
 * Multiple shortcuts can be registered per platform.
 */
export type PlatformKeyBindings = {
	/** Shortcut array for Mac (uses the meta key) */
	mac?: KeyBinding[];
	/** Shortcut array for Windows/Linux (uses the ctrl key) */
	win?: KeyBinding[];
	/** Default for platforms not explicitly specified */
	default: KeyBinding[];
};

/**
 * Definition of a command.
 * An operation executed via a keyboard shortcut or the context menu.
 */
export type Command = {
	/** Unique identifier of the command */
	id: string;
	/** Label shown in the menu */
	label: string;
	/** Category of the command */
	category?: "edit" | "view" | "arrange" | "selection";

	/**
	 * Determines whether the command can be executed.
	 * Used to enable/disable the menu item.
	 *
	 * `registries` is the per-canvas registry contract, passed explicitly (not
	 * read from state). Commands that don't need it may omit the parameter — a
	 * `(state) => ...` function still satisfies this type.
	 */
	canExecute: (
		state: CanvasControllerState,
		registries: ICanvasRegistries,
	) => boolean;

	/**
	 * Executes the command and returns a new CanvasControllerState.
	 * Implemented as a pure function (no side effects).
	 */
	execute: (
		state: CanvasControllerState,
		registries: ICanvasRegistries,
	) => CanvasControllerState;

	/**
	 * Platform-specific keyboard shortcuts.
	 */
	shortcuts?: PlatformKeyBindings;
};
