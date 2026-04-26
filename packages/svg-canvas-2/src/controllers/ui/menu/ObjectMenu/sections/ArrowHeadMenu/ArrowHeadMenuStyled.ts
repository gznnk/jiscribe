import styled from "@emotion/styled";

/**
 * 矢印セレクター グリッド（3列）。
 * DropdownPanel 内に配置する。
 */
export const ArrowSelectorGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 4px;
	padding: 8px;
`;

/**
 * 矢印タイプ選択ボタン。
 * SVGプレビューを表示する。
 */
export const ArrowTypeButton = styled.button<{ isActive?: boolean }>`
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 28px;
	padding: 2px;
	border: 1px solid ${(p) => (p.isActive ? "#6b7280" : "#e5e7eb")};
	border-radius: 4px;
	background: ${(p) => (p.isActive ? "#f3f4f6" : "transparent")};
	cursor: pointer;
	transition: all 0.15s;

	&:hover {
		background: #f0f0f0;
		border-color: #9ca3af;
	}
`;
