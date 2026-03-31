import { memo } from "react";

import { DiagramMenuContainer, DiagramMenuWrapper } from "./DiagramMenuStyled";
import { StackOrderMenu } from "./StackOrderMenu";
import { useDiagramMenuPosition } from "./useDiagramMenuPosition";
import type { CanvasState } from "../../../../states/canvas/CanvasState";

type DiagramMenuProps = {
	canvasState: CanvasState;
};

/**
 * 選択中オブジェクトの下に表示されるフローティングメニュー。
 * ScrollSyncedOverlay 内に配置され、キャンバススクロールに追従する。
 */
const DiagramMenuComponent: React.FC<DiagramMenuProps> = ({ canvasState }) => {
	const { shouldRender, x, y } = useDiagramMenuPosition(canvasState);

	if (!shouldRender) return null;

	return (
		<DiagramMenuWrapper
			left={x}
			top={y}
			style={{ transform: "translateX(-50%)" }}
		>
			<DiagramMenuContainer>
				<StackOrderMenu canvasState={canvasState} />
			</DiagramMenuContainer>
		</DiagramMenuWrapper>
	);
};

export const DiagramMenu = memo(DiagramMenuComponent);
