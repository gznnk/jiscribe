import styled from "@emotion/styled";

import { scrollbarStyles } from "../../../../constants/scrollbarStyles";

export const ErrorOverlayContainer = styled.div`
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(255, 255, 255, 0.9);
	backdrop-filter: blur(4px);
	z-index: 9999;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-start;
	padding: 40px 20px;
	overflow-y: auto;
	${scrollbarStyles}
`;

export const ErrorCard = styled.div`
	background-color: white;
	border: 1px solid #fca5a5;
	border-radius: 8px;
	box-shadow:
		0 4px 6px -1px rgba(255, 0, 0, 0.1),
		0 2px 4px -1px rgba(255, 0, 0, 0.06);
	width: 100%;
	max-width: 800px;
	padding: 24px;
`;

export const ErrorHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 16px;
	padding-bottom: 16px;
	border-bottom: 1px solid #fee2e2;
`;

export const ErrorTitle = styled.h2`
	margin: 0;
	color: #dc2626;
	font-size: 1.25rem;
	font-weight: 600;
	display: flex;
	align-items: center;
	gap: 8px;
`;

export const ErrorMessage = styled.p`
	color: #4b5563;
	margin: 0 0 16px 0;
	line-height: 1.5;
`;

export const CopyButton = styled.button`
	background-color: #f3f4f6;
	border: 1px solid #d1d5db;
	border-radius: 4px;
	padding: 6px 12px;
	font-size: 0.875rem;
	color: #374151;
	cursor: pointer;
	display: flex;
	align-items: center;
	gap: 6px;
	transition: all 0.2s;

	&:hover {
		background-color: #e5e7eb;
	}

	&:active {
		background-color: #d1d5db;
	}
`;

export const ErrorList = styled.ul`
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: 8px;
`;

export const ErrorListItem = styled.li`
	background-color: #fef2f2;
	border-left: 4px solid #ef4444;
	padding: 12px;
	border-radius: 0 4px 4px 0;
`;

export const ErrorPath = styled.div`
	font-family: monospace;
	font-size: 0.875rem;
	color: #991b1b;
	margin-bottom: 4px;
	font-weight: 500;
`;

export const ErrorDetail = styled.div`
	color: #7f1d1d;
	font-size: 0.95rem;
`;
