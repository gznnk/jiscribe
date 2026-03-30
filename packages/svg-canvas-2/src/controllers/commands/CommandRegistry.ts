import type { Command } from "./CommandTypes";
import { getPlatformShortcuts } from "./CommandUtils";

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
	 * プラットフォームに応じたショートカットと照合する
	 */
	findByShortcut(event: KeyboardEvent): Command | undefined {
		return Array.from(this.commands.values()).find((cmd) => {
			if (!cmd.shortcuts) return false;

			// 現在のプラットフォームに対応したショートカット配列を取得
			const bindings = getPlatformShortcuts(cmd.shortcuts);

			// 配列内のいずれかのショートカットがマッチするか確認
			return bindings.some(
				(binding) =>
					binding.key.toLowerCase() === event.key.toLowerCase() &&
					!!binding.ctrl === event.ctrlKey &&
					!!binding.shift === event.shiftKey &&
					!!binding.alt === event.altKey &&
					!!binding.meta === event.metaKey,
			);
		});
	}
}

/**
 * グローバルな CommandRegistry インスタンス
 */
export const commandRegistry = new CommandRegistry();
