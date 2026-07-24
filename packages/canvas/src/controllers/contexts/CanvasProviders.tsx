import type { ReactNode, RefObject } from "react";

import { CanvasRegistriesContext } from "./CanvasRegistriesContext";
import { CanvasViewportElementRefContext } from "./CanvasViewportElementRefContext";
import { PresentationRegistriesProvider } from "../../presentations/objects/registry/PresentationRegistriesProvider";
import type { CanvasTheme } from "../../theme/CanvasTheme";
import { CanvasThemeContext } from "../../theme/CanvasThemeContext";
import { CanvasLocaleContext } from "../messages/CanvasLocaleContext";
import type { CanvasMessages } from "../messages/CanvasMessages";
import { CanvasMessagesContext } from "../messages/CanvasMessagesContext";
import type { CanvasRegistries } from "../setup";

type CanvasProvidersProps = {
	theme: CanvasTheme;
	locale: string;
	messages: CanvasMessages;
	registries: CanvasRegistries;
	viewportElementRef: RefObject<HTMLDivElement | null>;
	children: ReactNode;
};

/**
 * Aggregates the context providers a live `<Canvas>` needs (theme, locale,
 * messages, the registry bundle, its three presentation registries, and the
 * viewport element ref) into one node, so Canvas.tsx renders its tree without
 * the deep provider nesting.
 */
export function CanvasProviders({
	theme,
	locale,
	messages,
	registries,
	viewportElementRef,
	children,
}: CanvasProvidersProps) {
	return (
		<CanvasThemeContext value={theme}>
			<CanvasLocaleContext value={locale}>
				<CanvasMessagesContext value={messages}>
					<CanvasRegistriesContext value={registries}>
						<PresentationRegistriesProvider
							objectComponent={registries.objectComponent}
							objectTextRegion={registries.objectTextRegion}
							objectOutline={registries.objectOutline}
						>
							<CanvasViewportElementRefContext value={viewportElementRef}>
								{children}
							</CanvasViewportElementRefContext>
						</PresentationRegistriesProvider>
					</CanvasRegistriesContext>
				</CanvasMessagesContext>
			</CanvasLocaleContext>
		</CanvasThemeContext>
	);
}
