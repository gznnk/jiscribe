import { DiamondElement } from "./DiamondStyled";
import type { DiamondState } from "../../../../states/objects/primitives/diamond/DiamondState";
import { createFrameObject } from "../../base/createFrameObject";

/**
 * 中心原点を頂点とする菱形（上・右・下・左）のポリゴン点列を作る。
 * テキストは菱形内ではなく BoundingBox 相当の矩形（-w/2,-h/2,w,h）に収める。
 */
const buildDiamondPoints = (width: number, height: number): string => {
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	return [
		`0,${-halfHeight}`,
		`${halfWidth},0`,
		`0,${halfHeight}`,
		`${-halfWidth},0`,
	].join(" ");
};

/** Diamond の表示（Frame 系共通ロジックは createFrameObject に集約、形状だけ差し替え）。 */
export const Diamond = createFrameObject<DiamondState>((state, shape) => (
	<DiamondElement
		{...shape}
		points={buildDiamondPoints(state.width, state.height)}
	/>
));
