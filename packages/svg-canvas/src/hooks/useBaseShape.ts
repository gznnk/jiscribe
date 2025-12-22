import type React from "react";

import type { ClickProps } from "./useClick";
import { useClick } from "./useClick";
import type { DragProps } from "./useDrag";
import { useDrag } from "./useDrag";
import type { HoverProps } from "./useHover";
import { useHover } from "./useHover";
import type { SelectProps } from "./useSelect";
import { useSelect } from "./useSelect";
import type { UseTextProps } from "./useText";
import { useText } from "./useText";

/**
 * Props for useBaseShape hook
 */
export type UseBaseShapeProps = UseTextProps &
	DragProps &
	ClickProps &
	SelectProps &
	HoverProps;

/**
 * Return type for useBaseShape hook
 */
export type UseBaseShapeReturn = {
	onDoubleClick: () => void;
	onPointerDown: (e: React.PointerEvent<SVGElement>) => void;
	onPointerMove: (e: React.PointerEvent<SVGElement>) => void;
	onPointerUp: (e: React.PointerEvent<SVGElement>) => void;
	onPointerEnter: () => void;
	onPointerLeave: () => void;
	onKeyDown: (e: React.KeyboardEvent<SVGGElement>) => void;
	onKeyUp: (e: React.KeyboardEvent<SVGGElement>) => void;
};

/**
 * Custom hook that combines common shape interaction hooks
 * Provides text, drag, click, select, and hover functionality
 */
export const useBaseShape = (props: UseBaseShapeProps): UseBaseShapeReturn => {
	// Use individual hooks directly with props
	const { onDoubleClick } = useText(props);
	const dragProps = useDrag(props);
	const clickProps = useClick(props);
	const selectProps = useSelect(props);
	const hoverProps = useHover(props);

	// Custom props merging without external dependency
	// Combine pointer events with proper precedence
	const mergedOnPointerDown = (e: React.PointerEvent<SVGElement>) => {
		dragProps.onPointerDown(e);
		clickProps.onPointerDown(e);
		selectProps.onPointerDown(e);
	};

	const mergedOnPointerMove = (e: React.PointerEvent<SVGElement>) => {
		dragProps.onPointerMove(e);
		clickProps.onPointerMove(e);
	};

	const mergedOnPointerUp = (e: React.PointerEvent<SVGElement>) => {
		dragProps.onPointerUp(e);
		clickProps.onPointerUp(e);
	};

	return {
		onDoubleClick,
		onPointerDown: mergedOnPointerDown,
		onPointerMove: mergedOnPointerMove,
		onPointerUp: mergedOnPointerUp,
		onPointerEnter: hoverProps.onPointerEnter,
		onPointerLeave: hoverProps.onPointerLeave,
		onKeyDown: dragProps.onKeyDown,
		onKeyUp: dragProps.onKeyUp,
	};
};
