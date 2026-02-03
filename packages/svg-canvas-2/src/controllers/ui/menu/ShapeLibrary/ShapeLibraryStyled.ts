import styled from "@emotion/styled";

/**
 * シェイプライブラリのコンテナ。
 * ビューポート左側に固定し、pointer-events: auto で操作を受け付ける。
 */
export const ShapeLibraryContainer = styled.div`
	position: absolute;
	top: 50%;
	left: 8px;
	transform: translateY(-50%);
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: 6px;
	background: rgba(255, 255, 255, 0.95);
	border: 1px solid #e5e7eb;
	border-radius: 8px;
	box-shadow:
		0 1px 3px rgba(0, 0, 0, 0.1),
		0 1px 2px rgba(0, 0, 0, 0.06);
	pointer-events: auto;
`;
