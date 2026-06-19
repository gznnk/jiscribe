import { css } from "@emotion/react";

/**
 * Custom scrollbar styles for webkit-based browsers.
 * Apply to any styled component that has overflow: auto or overflow: scroll.
 *
 * Usage:
 *   import { scrollbarStyles } from "../../../styles/scrollbarStyles";
 *
 *   const MyStyledDiv = styled.div`
 *     overflow-y: auto;
 *     ${scrollbarStyles}
 *   `;
 */
export const scrollbarStyles = css`
	&::-webkit-scrollbar {
		width: 8px;
		height: 8px;
	}

	&::-webkit-scrollbar-track {
		background: transparent;
	}

	&::-webkit-scrollbar-thumb {
		background-color: #d1d5db;
		border-radius: 4px;
		transition: background-color 0.3s;
	}

	&::-webkit-scrollbar-thumb:hover {
		background-color: #9ca3af;
	}

	&::-webkit-scrollbar-corner {
		background-color: transparent;
	}
`;
