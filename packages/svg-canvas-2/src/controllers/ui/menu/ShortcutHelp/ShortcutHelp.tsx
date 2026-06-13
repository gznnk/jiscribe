import { memo, useCallback, useEffect, useState } from "react";

import { ShortcutHelpModal } from "./ShortcutHelpModal";
import { HelpButton } from "./ShortcutHelpStyled";
import { HelpIcon } from "../../icons/HelpIcon";

/**
 * 入力系の要素にフォーカスがある場合は true。
 * グローバルショートカット（`?`）の誤発火を防ぐために使う。
 */
const isEditableTarget = (target: EventTarget | null): boolean => {
	return (
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement
	);
};

/**
 * キーボードショートカット一覧の入口。
 * ビューポート右下の「?」ボタン、または `?` キーで一覧モーダルを開く。
 * 状態は UI ローカルに閉じており、Canvas の reducer には依存しない。
 */
const ShortcutHelpComponent: React.FC = () => {
	const [isOpen, setIsOpen] = useState(false);

	const close = useCallback(() => setIsOpen(false), []);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// 開いているときは Escape で閉じる（入力欄にフォーカスがあっても閉じられる）
			if (isOpen) {
				if (event.key === "Escape") {
					event.preventDefault();
					setIsOpen(false);
				}
				return;
			}

			// `?`（多くの配列で Shift + /）で開く。修飾キー併用時・入力中は無視する
			if (
				event.key === "?" &&
				!event.ctrlKey &&
				!event.metaKey &&
				!event.altKey &&
				!isEditableTarget(event.target)
			) {
				event.preventDefault();
				setIsOpen(true);
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isOpen]);

	return (
		<>
			<HelpButton
				type="button"
				aria-label="Show keyboard shortcuts"
				data-id="shortcut-help:open"
				// data-gesture="none" を付けないと pointerdown が
				// ジェスチャーシステムに捕捉され click が発火しない
				data-gesture="none"
				onClick={() => setIsOpen(true)}
			>
				<HelpIcon />
			</HelpButton>
			{isOpen && <ShortcutHelpModal onClose={close} />}
		</>
	);
};

export const ShortcutHelp = memo(ShortcutHelpComponent);
