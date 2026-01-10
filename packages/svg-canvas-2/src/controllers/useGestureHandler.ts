import { useCallback } from "react";

import type { Gesture, GestureCallback } from "./useGestureRecognizer";

export type GestureHandlers = {
	onPressed?: (gesture: Gesture) => void;
	onClick?: (gesture: Gesture) => void;
	onDragStart?: (gesture: Gesture) => void;
	onDrag?: (gesture: Gesture) => void;
	onDragEnd?: (gesture: Gesture) => void;
};

export type GestureStrategy = Record<string, GestureHandlers>;

export const useGestureHandler = (
	strategy: GestureStrategy,
): GestureCallback => {
	return useCallback(
		(gesture: Gesture) => {
			const el = (gesture.target as Element | null)?.closest("[data-kind]");
			const kind = el?.getAttribute("data-kind");

			const handlers = kind ? strategy[kind] : undefined;
			if (!handlers) return;

			switch (gesture.type) {
				case "pressed":
					handlers.onPressed?.(gesture);
					break;
				case "click":
					handlers.onClick?.(gesture);
					break;
				case "dragStart":
					handlers.onDragStart?.(gesture);
					break;
				case "drag":
					handlers.onDrag?.(gesture);
					break;
				case "dragEnd":
					handlers.onDragEnd?.(gesture);
					break;
			}
		},
		[strategy],
	);
};
