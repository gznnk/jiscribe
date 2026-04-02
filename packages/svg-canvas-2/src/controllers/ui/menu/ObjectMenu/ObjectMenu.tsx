import { memo } from "react";

import { useMenuConfig } from "./getMenuConfig";
import {
	ObjectMenuContainer,
	ObjectMenuDivider,
	ObjectMenuWrapper,
} from "./ObjectMenuStyled";
import { AlignmentMenu } from "./sections/AlignmentMenu";
import { ArrowHeadMenu } from "./sections/ArrowHeadMenu";
import { BackgroundColorMenu } from "./sections/BackgroundColorMenu";
import { BoldMenu } from "./sections/BoldMenu";
import { FontColorMenu } from "./sections/FontColorMenu";
import { FontSizeMenu } from "./sections/FontSizeMenu";
import { GroupMenu } from "./sections/GroupMenu";
import { KeepAspectRatioMenu } from "./sections/KeepAspectRatioMenu";
import { StackOrderMenu } from "./sections/StackOrderMenu";
import { StrokeColorMenu } from "./sections/StrokeColorMenu";
import { useObjectMenuPosition } from "./useObjectMenuPosition";
import type { CanvasState } from "../../../../states/canvas/CanvasState";

type ObjectMenuProps = {
	canvasState: CanvasState;
};

/**
 * 選択中オブジェクトの下に表示されるフローティングメニュー。
 * ScrollSyncedOverlay 内に配置され、キャンバススクロールに追従する。
 *
 * 選択中オブジェクトの features に応じて表示するメニュー項目を動的に変更する。
 * - hasFill: 背景色メニュー
 * - hasStroke: ストローク色メニュー
 * - hasText: フォントカラー、太字、整列、フォントサイズ（見た目のみ）
 * - hasArrow: 矢印メニュー
 * - hasTransform: アスペクト比ロック
 * - StackOrder: 常に表示
 */
const ObjectMenuComponent: React.FC<ObjectMenuProps> = ({ canvasState }) => {
	const { shouldRender, x, y } = useObjectMenuPosition(canvasState);
	const menuConfig = useMenuConfig(canvasState);

	if (!shouldRender) return null;

	return (
		<ObjectMenuWrapper
			left={x}
			top={y}
			style={{ transform: "translateX(-50%)" }}
		>
			<ObjectMenuContainer>
				{/* Fill color section */}
				{menuConfig.hasFill && (
					<BackgroundColorMenu canvasState={canvasState} />
				)}

				{/* Stroke color section */}
				{menuConfig.hasStroke && (
					<>
						{menuConfig.hasFill && <ObjectMenuDivider />}
						<StrokeColorMenu canvasState={canvasState} />
					</>
				)}

				{/* Text section (appearance only) */}
				{menuConfig.hasText && (
					<>
						<ObjectMenuDivider />
						<FontColorMenu canvasState={canvasState} />
						<BoldMenu canvasState={canvasState} />
						<AlignmentMenu canvasState={canvasState} />
						<FontSizeMenu canvasState={canvasState} />
					</>
				)}

				{/* Arrow section */}
				{menuConfig.hasArrow && (
					<>
						<ObjectMenuDivider />
						<ArrowHeadMenu canvasState={canvasState} />
					</>
				)}

				{/* Stack order (always visible) */}
				<ObjectMenuDivider />
				<StackOrderMenu canvasState={canvasState} />

				{/* Aspect ratio lock */}
				{menuConfig.hasTransform && (
					<KeepAspectRatioMenu canvasState={canvasState} />
				)}

				{/* Group / Ungroup */}
				<GroupMenu canvasState={canvasState} />
			</ObjectMenuContainer>
		</ObjectMenuWrapper>
	);
};

export const ObjectMenu = memo(ObjectMenuComponent);
