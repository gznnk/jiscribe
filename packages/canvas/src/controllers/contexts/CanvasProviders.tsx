import type { ReactNode, RefObject } from "react";

import { CanvasRegistriesContext } from "./CanvasRegistriesContext";
import { CanvasViewportRefContext } from "./CanvasViewportRefContext";
import { PresentationRegistriesProvider } from "../../presentations/objects/registry/PresentationRegistriesProvider";
import type { CanvasTheme } from "../../theme/CanvasTheme";
import { CanvasThemeContext } from "../../theme/CanvasThemeContext";
import type { CanvasMessages } from "../messages/CanvasMessages";
import { CanvasMessagesContext } from "../messages/CanvasMessagesContext";
import type { CanvasRegistries } from "../setup";

type CanvasProvidersProps = {
	theme: CanvasTheme;
	messages: CanvasMessages;
	registries: CanvasRegistries;
	viewportRef: RefObject<HTMLDivElement | null>;
	children: ReactNode;
};

/**
 * Aggregates the context providers a live `<Canvas>` needs (theme, messages,
 * the registry bundle, its three presentation registries, and the viewport
 * ref) into one node, so Canvas.tsx renders its tree without the deep provider
 * nesting.
 */
export function CanvasProviders({
	theme,
	messages,
	registries,
	viewportRef,
	children,
}: CanvasProvidersProps) {
	return (
		<CanvasThemeContext value={theme}>
			<CanvasMessagesContext value={messages}>
				<CanvasRegistriesContext value={registries}>
					<PresentationRegistriesProvider
						objectComponent={registries.objectComponent}
						textRegion={registries.textRegion}
						shapeOutline={registries.shapeOutline}
					>
						<CanvasViewportRefContext value={viewportRef}>
							{children}
						</CanvasViewportRefContext>
					</PresentationRegistriesProvider>
				</CanvasRegistriesContext>
			</CanvasMessagesContext>
		</CanvasThemeContext>
	);
}
