import type { ReactNode } from "react";

import type { ObjectAnchorRegionRegistry } from "./ObjectAnchorRegionRegistry";
import { ObjectAnchorRegionRegistryContext } from "./ObjectAnchorRegionRegistryContext";
import type { ObjectComponentRegistry } from "./ObjectComponentRegistry";
import { ObjectComponentRegistryContext } from "./ObjectComponentRegistryContext";
import type { ObjectOutlineRegistry } from "./ObjectOutlineRegistry";
import { ObjectOutlineRegistryContext } from "./ObjectOutlineRegistryContext";
import type { ObjectTextRegionRegistry } from "./ObjectTextRegionRegistry";
import { ObjectTextRegionRegistryContext } from "./ObjectTextRegionRegistryContext";

type PresentationRegistriesProviderProps = {
	objectComponent: ObjectComponentRegistry;
	objectTextRegion: ObjectTextRegionRegistry;
	objectOutline: ObjectOutlineRegistry;
	objectAnchorRegion: ObjectAnchorRegionRegistry;
	children: ReactNode;
};

/**
 * Bundles the presentation-layer registry contexts so consumers (`Canvas`,
 * `CanvasThumbnail`) provide them in one node instead of a nested stack. Takes
 * the registries individually rather than the controllers-layer
 * `CanvasRegistries` bundle (docs/02-architecture.md layering).
 */
export function PresentationRegistriesProvider({
	objectComponent,
	objectTextRegion,
	objectOutline,
	objectAnchorRegion,
	children,
}: PresentationRegistriesProviderProps) {
	return (
		<ObjectComponentRegistryContext value={objectComponent}>
			<ObjectTextRegionRegistryContext value={objectTextRegion}>
				<ObjectOutlineRegistryContext value={objectOutline}>
					<ObjectAnchorRegionRegistryContext value={objectAnchorRegion}>
						{children}
					</ObjectAnchorRegionRegistryContext>
				</ObjectOutlineRegistryContext>
			</ObjectTextRegionRegistryContext>
		</ObjectComponentRegistryContext>
	);
}
