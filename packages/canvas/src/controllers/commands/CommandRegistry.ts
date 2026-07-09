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
	 */
	register(command: Command): this {
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
	 * Finds the command matching a keyboard event.
	 * Matches against the shortcuts for the current platform.
	 */
	findByShortcut(event: KeyboardEvent): Command | undefined {
		return Array.from(this.commands.values()).find((cmd) => {
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
