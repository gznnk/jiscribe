import type { ReactNode } from "react";

import type { ObjectComponentRegistry } from "./ObjectComponentRegistry";
import { ObjectComponentRegistryContext } from "./ObjectComponentRegistryContext";
import type { OutlineRegistry } from "./OutlineRegistry";
import { OutlineRegistryContext } from "./OutlineRegistryContext";
import type { TextRegionRegistry } from "./TextRegionRegistry";
import { TextRegionRegistryContext } from "./TextRegionRegistryContext";

type PresentationRegistriesProviderProps = {
	objectComponent: ObjectComponentRegistry;
	textRegion: TextRegionRegistry;
	outline: OutlineRegistry;
	children: ReactNode;
};

/**
 * Bundles the three presentation-layer registry contexts so consumers
 * (`Canvas`, `CanvasThumbnail`) provide them in one node instead of a nested
 * stack. Takes the registries individually rather than the controllers-layer
 * `CanvasRegistries` bundle (docs/02-architecture.md layering).
 */
export function PresentationRegistriesProvider({
	objectComponent,
	textRegion,
	outline,
	children,
}: PresentationRegistriesProviderProps) {
	return (
		<ObjectComponentRegistryContext value={objectComponent}>
			<TextRegionRegistryContext value={textRegion}>
				<OutlineRegistryContext value={outline}>
					{children}
				</OutlineRegistryContext>
			</TextRegionRegistryContext>
		</ObjectComponentRegistryContext>
	);
}
