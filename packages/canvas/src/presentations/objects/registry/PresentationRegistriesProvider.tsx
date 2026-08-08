import type { ReactNode } from "react";

import type { ObjectAnchorRegionRegistry } from "./ObjectAnchorRegionRegistry";
import { ObjectAnchorRegionRegistryContext } from "./ObjectAnchorRegionRegistryContext";
import type { ObjectComponentRegistry } from "./ObjectComponentRegistry";
import { ObjectComponentRegistryContext } from "./ObjectComponentRegistryContext";
import type { ObjectExtraConnectPointsRegistry } from "./ObjectExtraConnectPointsRegistry";
import { ObjectExtraConnectPointsRegistryContext } from "./ObjectExtraConnectPointsRegistryContext";
import type { ObjectGeometryKeyRegistry } from "./ObjectGeometryKeyRegistry";
import { ObjectGeometryKeyRegistryContext } from "./ObjectGeometryKeyRegistryContext";
import type { ObjectOutlineRegistry } from "./ObjectOutlineRegistry";
import { ObjectOutlineRegistryContext } from "./ObjectOutlineRegistryContext";
import type { ObjectSvgDefsRegistry } from "./ObjectSvgDefsRegistry";
import { ObjectSvgDefsRegistryContext } from "./ObjectSvgDefsRegistryContext";
import type { ObjectTextRegionRegistry } from "./ObjectTextRegionRegistry";
import { ObjectTextRegionRegistryContext } from "./ObjectTextRegionRegistryContext";

type PresentationRegistriesProviderProps = {
	objectComponent: ObjectComponentRegistry;
	objectTextRegion: ObjectTextRegionRegistry;
	objectOutline: ObjectOutlineRegistry;
	objectAnchorRegion: ObjectAnchorRegionRegistry;
	objectExtraConnectPoints: ObjectExtraConnectPointsRegistry;
	objectGeometryKey: ObjectGeometryKeyRegistry;
	objectSvgDefs: ObjectSvgDefsRegistry;
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
	objectExtraConnectPoints,
	objectGeometryKey,
	objectSvgDefs,
	children,
}: PresentationRegistriesProviderProps) {
	return (
		<ObjectComponentRegistryContext value={objectComponent}>
			<ObjectTextRegionRegistryContext value={objectTextRegion}>
				<ObjectOutlineRegistryContext value={objectOutline}>
					<ObjectAnchorRegionRegistryContext value={objectAnchorRegion}>
						<ObjectExtraConnectPointsRegistryContext
							value={objectExtraConnectPoints}
						>
							<ObjectGeometryKeyRegistryContext value={objectGeometryKey}>
								<ObjectSvgDefsRegistryContext value={objectSvgDefs}>
									{children}
								</ObjectSvgDefsRegistryContext>
							</ObjectGeometryKeyRegistryContext>
						</ObjectExtraConnectPointsRegistryContext>
					</ObjectAnchorRegionRegistryContext>
				</ObjectOutlineRegistryContext>
			</ObjectTextRegionRegistryContext>
		</ObjectComponentRegistryContext>
	);
}
