import type { Command } from "./CommandTypes";
import { getPlatformShortcuts, matchesKeyBinding } from "./CommandUtils";

/**
 * Where a registered command came from: the canvas's own set or a plugin's
 * `commands`. It decides which of two commands sharing a keystroke is offered
 * it first (findAllByShortcut).
 */
export type CommandOrigin = "builtIn" | "contributed";

/**
 * Registry that manages Commands.
 * Provides registration, lookup, and search by shortcut.
 */
export class CommandRegistry {
	private commands = new Map<string, Command>();

	private contributedCommandIds = new Set<string>();

	/**
	 * Registers a command.
	 *
	 * @param command - Its `id` must be free: a second registration under an id
	 *   already taken throws, so a plugin cannot quietly replace a built-in
	 *   command (same rule as object types, see docs/12-plugin-architecture.md).
	 * @param origin - `"contributed"` for a plugin's command, which then claims a
	 *   shared keystroke ahead of every built-in (findAllByShortcut). Defaults to
	 *   `"builtIn"`
	 */
	register(command: Command, origin: CommandOrigin = "builtIn"): this {
		if (this.commands.has(command.id)) {
			throw new Error(
				`CommandRegistry: command id "${command.id}" is already registered`,
			);
		}
		this.commands.set(command.id, command);
		if (origin === "contributed") {
			this.contributedCommandIds.add(command.id);
		}
		return this;
	}

	/**
	 * Registers multiple commands at once.
	 * Lets a factory-generated array (such as the move commands) fit into the fluent chain.
	 *
	 * @param commands - Registered in array order, each under the rule of {@link register}
	 * @param origin - Applied to every one of them; see {@link register}
	 */
	registerAll(
		commands: readonly Command[],
		origin: CommandOrigin = "builtIn",
	): this {
		for (const command of commands) {
			this.register(command, origin);
		}
		return this;
	}

	/**
	 * Removes all registered commands so the registry can be repopulated from
	 * scratch (clear-then-register convention shared by the bundle registries).
	 */
	clear(): void {
		this.commands.clear();
		this.contributedCommandIds.clear();
	}

	/**
	 * Gets a command by its command ID.
	 */
	get(commandId: string): Command | undefined {
		return this.commands.get(commandId);
	}

	/**
	 * Gets all registered commands, in registration order. Unlike
	 * findAllByShortcut, contributed commands are not moved ahead.
	 */
	getAll(): Command[] {
		return Array.from(this.commands.values());
	}

	/**
	 * Finds every command a keyboard event matches, contributed commands first.
	 * Matches against the shortcuts for the current platform.
	 *
	 * All matches are returned rather than the first, because a binding may be
	 * shared by commands that are available in different contexts (Tab over a
	 * table cell versus over a shape's text slots). The caller picks among them
	 * by `canExecute`; see useKeyboardShortcuts.
	 *
	 * Contributed commands are put ahead so a plugin can take over a built-in key
	 * in the context it owns (a table's bare arrows moving the cell selection
	 * rather than nudging the table). A contributed command therefore claims the
	 * key whenever its `canExecute` is true, and has to keep that check narrow.
	 *
	 * @param event - The keydown to match; `code` is compared for
	 *   layout-independent bindings and `key` for character ones, and the
	 *   modifier flags must agree exactly (shift only for the `code` form).
	 * @returns The matching commands, the contributed ones in registration order
	 *   followed by the built-in ones in registration order, or an empty array
	 *   when the keystroke is not bound.
	 */
	findAllByShortcut(event: KeyboardEvent): Command[] {
		const matched = Array.from(this.commands.values()).filter((cmd) => {
			if (!cmd.shortcuts) {
				return false;
			}

			const bindings = getPlatformShortcuts(cmd.shortcuts);

			return bindings.some((binding) => matchesKeyBinding(binding, event));
		});
		return [
			...matched.filter((cmd) => this.contributedCommandIds.has(cmd.id)),
			...matched.filter((cmd) => !this.contributedCommandIds.has(cmd.id)),
		];
	}
}

/**
 * The global CommandRegistry instance.
 */
export const createCommandRegistry = (): CommandRegistry =>
	new CommandRegistry();
