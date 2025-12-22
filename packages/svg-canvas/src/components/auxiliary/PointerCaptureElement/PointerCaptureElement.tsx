import { memo, useCallback } from "react";

import { CaptureElement } from "./PointerCaptureElementStyled";
import type { PointerCaptureElementProps } from "./PointerCaptureElementTypes";

/**
 * Invisible element for pointer capture during area selection.
 * This component enables auto-scroll functionality when the pointer moves outside the viewport
 * by preventing SVG pointer capture from blocking browser's pointer tracking.
 */
const PointerCaptureElementComponent = ({
	elementRef,
	capturedPointerId,
	onPointerMove,
	onPointerUp,
}: PointerCaptureElementProps): React.JSX.Element => {
	/**
	 * Handle pointer move events and forward to parent if pointer is captured
	 */
	const handlePointerMove = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			// Only handle events for the captured pointer
			if (capturedPointerId === e.pointerId) {
				onPointerMove?.(e);
			}
		},
		[capturedPointerId, onPointerMove],
	);

	/**
	 * Handle pointer up events and forward to parent if pointer is captured
	 */
	const handlePointerUp = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			// Only handle events for the captured pointer
			if (capturedPointerId === e.pointerId) {
				onPointerUp?.(e);
			}
		},
		[capturedPointerId, onPointerUp],
	);

	return (
		<CaptureElement
			ref={elementRef}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
		/>
	);
};

export const PointerCaptureElement = memo(PointerCaptureElementComponent);
