import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";

import { DropdownPanelRoot } from "./DropdownPanelStyled";

/**
 * ドロップダウンパネル。ボタンの下または上に中央揃えで表示される。
 *
 * パネルの余白・ボタン間のギャップ・枠線部分をクリックしても、ジェスチャーの
 * 祖先探索（closest("[data-kind]")）が Viewport（data-kind="canvas"）まで遡って
 * 選択解除・メニュー閉じが発火しないよう、パネル自身を object-menu ターゲットとして
 * 宣言する。ObjectMenuHandler は未知の actionId では何もしないため、背景クリックは
 * no-op となりメニューと選択が維持される。内側のボタンは自身の data-kind を持つので
 * closest が先にボタンを拾い、従来どおり動作する。
 */
export const DropdownPanel = forwardRef<
	HTMLDivElement,
	ComponentPropsWithoutRef<typeof DropdownPanelRoot>
>((props, ref) => (
	<DropdownPanelRoot
		ref={ref}
		data-kind="object-menu"
		data-id="object-menu:panel"
		{...props}
	/>
));
DropdownPanel.displayName = "DropdownPanel";
