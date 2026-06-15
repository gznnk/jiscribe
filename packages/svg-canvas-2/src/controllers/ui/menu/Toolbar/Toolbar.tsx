import { memo, useCallback, useEffect, useState } from "react";

import {
	ToolbarContainer,
	ToolbarDivider,
	ToolbarGroup,
	ToolbarIconButton,
	ZoomReadout,
} from "./ToolbarStyled";
import { HelpIcon } from "../../icons/HelpIcon";
import { ShapeLibraryItem } from "../ShapeLibrary/ShapeLibraryItem";
import { SHAPE_PRESETS } from "../ShapeLibrary/ShapePresets";
import { ShortcutHelpModal } from "../ShortcutHelp/ShortcutHelpModal";

type ToolbarProps = {
	/** 現在ドロー中のシェイププリセット ID（ツールのアクティブ表示用） */
	activePresetId: string | null;
	/** 現在のズーム倍率（1 = 100%） */
	zoom: number;
};

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
 * 上部中央の統合ツールバー。
 * 図形ツール（ShapeLibrary）・ズーム表示・ヘルプ（?）を 1 本のバーにまとめる。
 *
 * - 図形ツールはジェスチャーシステム（data-kind="menu-item"）経由で動作する。
 * - ズームの +/- は現状は見た目のみ（操作はホイール / ピンチ）。
 * - ヘルプはモーダル表示で、`?` キーでも開ける。Canvas の reducer には依存しない。
 */
const ToolbarComponent: React.FC<ToolbarProps> = ({ activePresetId, zoom }) => {
	const [isHelpOpen, setIsHelpOpen] = useState(false);
	const closeHelp = useCallback(() => setIsHelpOpen(false), []);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// 開いているときは Escape で閉じる（入力欄にフォーカスがあっても閉じられる）
			if (isHelpOpen) {
				if (event.key === "Escape") {
					event.preventDefault();
					setIsHelpOpen(false);
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
				setIsHelpOpen(true);
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isHelpOpen]);

	return (
		<>
			<ToolbarContainer>
				{/* 左: 図形ツール */}
				<ToolbarGroup>
					{SHAPE_PRESETS.map((preset) => (
						<ShapeLibraryItem
							key={preset.id}
							preset={preset}
							isActive={activePresetId === preset.id}
						/>
					))}
				</ToolbarGroup>

				{/* 右: ズーム表示・ヘルプ */}
				<ToolbarGroup>
					{/* TODO: ズーム操作の配線（現状はホイール / ピンチ。ここは見た目のみ） */}
					<ToolbarIconButton
						type="button"
						aria-label="Zoom out"
						title="Zoom out"
						data-gesture="none"
					>
						−
					</ToolbarIconButton>
					<ZoomReadout>{Math.round(zoom * 100)}%</ZoomReadout>
					<ToolbarIconButton
						type="button"
						aria-label="Zoom in"
						title="Zoom in"
						data-gesture="none"
					>
						+
					</ToolbarIconButton>

					<ToolbarDivider />

					<ToolbarIconButton
						type="button"
						aria-label="Show keyboard shortcuts"
						title="Keyboard shortcuts"
						data-id="shortcut-help:open"
						// data-gesture="none" を付けないと pointerdown が
						// ジェスチャーシステムに捕捉され click が発火しない
						data-gesture="none"
						onClick={() => setIsHelpOpen(true)}
					>
						<HelpIcon />
					</ToolbarIconButton>
				</ToolbarGroup>
			</ToolbarContainer>
			{isHelpOpen && <ShortcutHelpModal onClose={closeHelp} />}
		</>
	);
};

export const Toolbar = memo(ToolbarComponent);
