import type { Command } from "./CommandTypes";
import { getPlatformShortcuts } from "./CommandUtils";

/**
 * Registry that manages Commands.
 * Provides registration, lookup, and search by shortcut.
 */
export class CommandRegistry {
	private commands = new Map<string, Command>();

	/**
	 * Registers a command.
	 *
	 * @param command - Its `id` must be free: a second registration under an id
	 *   already taken throws, so a plugin cannot quietly replace a built-in
	 *   command (same rule as object types, see docs/12-plugin-architecture.md).
	 */
	register(command: Command): this {
		if (this.commands.has(command.id)) {
			throw new Error(
				`CommandRegistry: command id "${command.id}" is already registered`,
			);
		}
		this.commands.set(command.id, command);
		return this;
	}

	/**
	 * Registers multiple commands at once.
	 * Lets a factory-generated array (such as the move commands) fit into the fluent chain.
	 */
	registerAll(commands: Command[]): this {
		for (const command of commands) {
			this.register(command);
		}
		return this;
	}

	/**
	 * Removes all registered commands so the registry can be repopulated from
	 * scratch (clear-then-register convention shared by the bundle registries).
	 */
	clear(): void {
		this.commands.clear();
	}

	/**
	 * Gets a command by its command ID.
	 */
	get(commandId: string): Command | undefined {
		return this.commands.get(commandId);
	}

	/**
	 * Gets all registered commands.
	 */
	getAll(): Command[] {
		return Array.from(this.commands.values());
	}

	/**
	 * Finds every command a keyboard event matches, in registration order.
	 * Matches against the shortcuts for the current platform.
	 *
	 * All matches are returned rather than the first, because a binding may be
	 * shared by commands that are available in different contexts (Tab over a
	 * table cell versus over a shape's text slots). The caller picks among them
	 * by `canExecute`; see useKeyboardShortcuts.
	 *
	 * @param event - The keydown to match; `code` is compared for
	 *   layout-independent bindings and `key` for character ones, and the
	 *   modifier flags must agree exactly (shift only for the `code` form).
	 * @returns The matching commands in the order they were registered, or an
	 *   empty array when the keystroke is not bound.
	 */
	findAllByShortcut(event: KeyboardEvent): Command[] {
		return Array.from(this.commands.values()).filter((cmd) => {
			if (!cmd.shortcuts) {
				return false;
			}

			// Get the shortcut array for the current platform
			const bindings = getPlatformShortcuts(cmd.shortcuts);

			// Check whether any shortcut in the array matches
			return bindings.some((binding) => {
				const isCodeBased = binding.code !== undefined;
				const keyMatch = isCodeBased
					? binding.code === event.code
					: binding.key === event.key;
				return (
					keyMatch &&
					!!binding.ctrl === event.ctrlKey &&
					!!binding.alt === event.altKey &&
					!!binding.meta === event.metaKey &&
					// For key-based bindings, shift is subsumed by the character value, so skip it
					(isCodeBased ? !!binding.shift === event.shiftKey : true)
				);
			});
		});
	}
}

/**
 * The global CommandRegistry instance.
 */
export const createCommandRegistry = (): CommandRegistry =>
	new CommandRegistry();
