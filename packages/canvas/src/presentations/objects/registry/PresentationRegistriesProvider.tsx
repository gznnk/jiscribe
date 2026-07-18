import type { ReactNode } from "react";

import type { ObjectComponentRegistry } from "./ObjectComponentRegistry";
import { ObjectComponentRegistryContext } from "./ObjectComponentRegistryContext";
import type { ShapeOutlineRegistry } from "./ShapeOutlineRegistry";
import { ShapeOutlineRegistryContext } from "./ShapeOutlineRegistryContext";
import type { TextRegionRegistry } from "./TextRegionRegistry";
import { TextRegionRegistryContext } from "./TextRegionRegistryContext";

type PresentationRegistriesProviderProps = {
	objectComponent: ObjectComponentRegistry;
	textRegion: TextRegionRegistry;
	shapeOutline: ShapeOutlineRegistry;
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
	shapeOutline,
	children,
}: PresentationRegistriesProviderProps) {
	return (
		<ObjectComponentRegistryContext value={objectComponent}>
			<TextRegionRegistryContext value={textRegion}>
				<ShapeOutlineRegistryContext value={shapeOutline}>
					{children}
				</ShapeOutlineRegistryContext>
			</TextRegionRegistryContext>
		</ObjectComponentRegistryContext>
	);
}
