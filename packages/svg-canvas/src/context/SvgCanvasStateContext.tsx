import { createContext, useContext } from "react";

import type { SvgCanvasState } from "../canvas/types/SvgCanvasState";

/**
 * React context for providing a ref to the SVG canvas state.
 * Used to share the canvas state ref across the SVG canvas feature.
 */
export const SvgCanvasStateContext =
	createContext<React.RefObject<SvgCanvasState> | null>(null);

/**
 * Props for SvgCanvasStateProvider.
 * @property canvasStateRef - Ref object for the SVG canvas state
 * @property children - React children to render within the provider
 */
type SvgCanvasStateProviderProps = {
	canvasStateRef: React.RefObject<SvgCanvasState>;
	children: React.ReactNode;
};

/**
 * Provides the SVG canvas state ref to all child components via context.
 * Should wrap any component tree that needs access to the canvas state ref.
 */
export const SvgCanvasStateProvider = ({
	canvasStateRef,
	children,
}: SvgCanvasStateProviderProps) => {
	return (
		<SvgCanvasStateContext.Provider value={canvasStateRef}>
			{children}
		</SvgCanvasStateContext.Provider>
	);
};

/**
 * Custom hook to access the SVG canvas state ref from context.
 * Throws if used outside of SvgCanvasStateProvider.
 * @returns Ref object for the SVG canvas state
 */
export const useSvgCanvasState = (): React.RefObject<SvgCanvasState> => {
	const ctx = useContext(SvgCanvasStateContext);
	if (!ctx)
		throw new Error(
			"useSvgCanvasState must be used within a SvgCanvasStateProvider",
		);
	return ctx;
};
