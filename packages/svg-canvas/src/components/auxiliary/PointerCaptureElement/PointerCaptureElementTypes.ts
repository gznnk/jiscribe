/**
 * Props for the PointerCaptureElement component
 */
export type PointerCaptureElementProps = {
	/** Reference to the element for pointer capture */
	elementRef: React.RefObject<HTMLDivElement | null>;
	/** Current captured pointer ID */
	capturedPointerId: number | null;
	/** Called when pointer moves while captured */
	onPointerMove?: (e: React.PointerEvent<HTMLDivElement>) => void;
	/** Called when pointer is released while captured */
	onPointerUp?: (e: React.PointerEvent<HTMLDivElement>) => void;
};
