import type { ReactNode, RefObject } from "react";

import { CanvasViewportElementRefContext } from "./CanvasViewportElementRefContext";
import { CanvasLocaleContext } from "./messages/CanvasLocaleContext";
import { CanvasMessagesContext } from "./messages/CanvasMessagesContext";
import type { CanvasMessages } from "./messages/CanvasMessagesTypes";
import type { CanvasRegistries } from "./registries";
import { CanvasRegistriesContext } from "./registries/CanvasRegistriesContext";
import { FontsLoadedNonceContext } from "../rendering/objects/FontsLoadedNonceContext";
import { RenderingRegistriesProvider } from "../rendering/objects/registry/RenderingRegistriesProvider";
import type { ResolvedImageLookup } from "../rendering/objects/ResolvedImagesContext";
import { ResolvedImagesContext } from "../rendering/objects/ResolvedImagesContext";
import type { CanvasTheme } from "../theme/CanvasTheme";
import { CanvasThemeContext } from "../theme/CanvasThemeContext";

type CanvasProvidersProps = {
	theme: CanvasTheme;
	locale: string;
	messages: CanvasMessages;
	registries: CanvasRegistries;
	/** The counter from `useDocFonts`, handed to the render-time measurement sites. */
	fontsNonce: number;
	/** The lookup from `useDocImages`, handed to the image shapes. */
	lookupResolvedImage: ResolvedImageLookup;
	viewportElementRef: RefObject<HTMLDivElement | null>;
	children: ReactNode;
};

/**
 * Aggregates the context providers a live `<Canvas>` needs (theme, locale,
 * messages, the registry bundle, its three rendering registries, the
 * fonts-loaded counter, the resolved images, and the viewport element ref) into one node, so
 * Canvas.tsx renders its tree without the deep provider nesting.
 */
export function CanvasProviders({
	theme,
	locale,
	messages,
	registries,
	fontsNonce,
	lookupResolvedImage,
	viewportElementRef,
	children,
}: CanvasProvidersProps) {
	return (
		<CanvasThemeContext value={theme}>
			<CanvasLocaleContext value={locale}>
				<CanvasMessagesContext value={messages}>
					<CanvasRegistriesContext value={registries}>
						<RenderingRegistriesProvider
							objectComponent={registries.objectComponent}
							objectTextRegion={registries.objectTextRegion}
							objectTextStyleDefaults={registries.objectTextStyleDefaults}
							objectShapeStyleDefaults={registries.objectShapeStyleDefaults}
							objectOutline={registries.objectOutline}
							objectAnchorRegion={registries.objectAnchorRegion}
							objectExtraConnectPoints={registries.objectExtraConnectPoints}
							objectGeometryKey={registries.objectGeometryKey}
							objectSvgDefs={registries.objectSvgDefs}
						>
							<FontsLoadedNonceContext value={fontsNonce}>
								<ResolvedImagesContext value={lookupResolvedImage}>
									<CanvasViewportElementRefContext value={viewportElementRef}>
										{children}
									</CanvasViewportElementRefContext>
								</ResolvedImagesContext>
							</FontsLoadedNonceContext>
						</RenderingRegistriesProvider>
					</CanvasRegistriesContext>
				</CanvasMessagesContext>
			</CanvasLocaleContext>
		</CanvasThemeContext>
	);
}
