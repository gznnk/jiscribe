import type { Command } from "./CommandTypes";

/**
 * Command を管理するレジストリ
 * コマンドの登録、取得、ショートカットからの検索を提供
 */
class CommandRegistry {
	private commands = new Map<string, Command>();

	/**
	 * コマンドを登録する
	 */
	register(command: Command): this {
		this.commands.set(command.id, command);
		return this;
	}

	/**
	 * コマンドIDからコマンドを取得
	 */
	get(commandId: string): Command | undefined {
		return this.commands.get(commandId);
	}

	/**
	 * 登録されているすべてのコマンドを取得
	 */
	getAll(): Command[] {
		return Array.from(this.commands.values());
	}

	/**
	 * キーボードイベントに一致するコマンドを検索
	 */
	findByShortcut(event: KeyboardEvent): Command | undefined {
		return Array.from(this.commands.values()).find((cmd) =>
			cmd.shortcuts?.some(
				(binding) =>
					binding.key.toLowerCase() === event.key.toLowerCase() &&
					!!binding.ctrl === event.ctrlKey &&
					!!binding.shift === event.shiftKey &&
					!!binding.alt === event.altKey &&
					!!binding.meta === event.metaKey,
			),
		);
	}
}

/**
 * グローバルな CommandRegistry インスタンス
 */
export const commandRegistry = new CommandRegistry();
