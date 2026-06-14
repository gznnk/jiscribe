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
	 * 複数のコマンドをまとめて登録する。
	 * ファクトリ生成した配列（移動コマンド等）を fluent chain に溶け込ませるためのもの。
	 */
	registerAll(commands: Command[]): this {
		for (const command of commands) {
			this.register(command);
		}
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
			if (!cmd.shortcuts) {
				return false;
			}

			// 現在のプラットフォームに対応したショートカット配列を取得
			const bindings = getPlatformShortcuts(cmd.shortcuts);

			// 配列内のいずれかのショートカットがマッチするか確認
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
					// key ベースの場合は shift を文字値が内包するためスキップ
					(isCodeBased ? !!binding.shift === event.shiftKey : true)
				);
			});
		});
	}
}

/**
 * グローバルな CommandRegistry インスタンス
 */
export const commandRegistry = new CommandRegistry();
