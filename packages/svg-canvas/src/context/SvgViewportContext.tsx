import { createContext, useContext } from "react";

import type { SvgViewport } from "../types/core/SvgViewport";

/**
 * React context for providing a ref to the SVG viewport.
 * Used to share the viewport ref across the SVG canvas feature.
 */
export const SvgViewportContext =
	createContext<React.RefObject<SvgViewport> | null>(null);

/**
 * Props for SvgViewportProvider.
 * @property viewportRef - Ref object for the SVG viewport
 * @property children - React children to render within the provider
 */
type SvgViewportProviderProps = {
	viewportRef: React.RefObject<SvgViewport>;
	children: React.ReactNode;
};

/**
 * Provides the SVG viewport ref to all child components via context.
 * Should wrap any component tree that needs access to the viewport ref.
 */
export const SvgViewportProvider = ({
	viewportRef,
	children,
}: SvgViewportProviderProps) => {
	return (
		<SvgViewportContext.Provider value={viewportRef}>
			{children}
		</SvgViewportContext.Provider>
	);
};

/**
 * Custom hook to access the SVG viewport ref from context.
 * Throws if used outside of SvgViewportProvider.
 * @returns Ref object for the SVG viewport
 */
export const useSvgViewport = (): React.RefObject<SvgViewport> => {
	const ctx = useContext(SvgViewportContext);
	if (!ctx)
		throw new Error("useSvgViewport must be used within a SvgViewportProvider");
	return ctx;
};
