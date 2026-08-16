import type { ReactNode } from "react";

import { ObjectAnchorRegionRegistryContext } from "./ObjectAnchorRegionRegistryContext";
import type { ObjectComponentRegistry } from "./ObjectComponentRegistry";
import { ObjectComponentRegistryContext } from "./ObjectComponentRegistryContext";
import { ObjectExtraConnectPointsRegistryContext } from "./ObjectExtraConnectPointsRegistryContext";
import type { ObjectGeometryKeyRegistry } from "./ObjectGeometryKeyRegistry";
import { ObjectGeometryKeyRegistryContext } from "./ObjectGeometryKeyRegistryContext";
import { ObjectOutlineRegistryContext } from "./ObjectOutlineRegistryContext";
import type { ObjectSvgDefsRegistry } from "./ObjectSvgDefsRegistry";
import { ObjectSvgDefsRegistryContext } from "./ObjectSvgDefsRegistryContext";
import type { ObjectTextRegionRegistry } from "./ObjectTextRegionRegistry";
import { ObjectTextRegionRegistryContext } from "./ObjectTextRegionRegistryContext";
import { ObjectTextStyleDefaultsRegistryContext } from "./ObjectTextStyleDefaultsRegistryContext";
import type { ObjectAnchorRegionRegistry } from "../../../domain/state/registry/ObjectAnchorRegionRegistry";
import type { ObjectExtraConnectPointsRegistry } from "../../../domain/state/registry/ObjectExtraConnectPointsRegistry";
import type { ObjectOutlineRegistry } from "../../../domain/state/registry/ObjectOutlineRegistry";
import type { ObjectTextStyleDefaultsRegistry } from "../../../schemas/registry/ObjectTextStyleDefaultsRegistry";

type PresentationRegistriesProviderProps = {
	objectComponent: ObjectComponentRegistry;
	objectTextRegion: ObjectTextRegionRegistry;
	objectTextStyleDefaults: ObjectTextStyleDefaultsRegistry;
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
	objectTextStyleDefaults,
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
				<ObjectTextStyleDefaultsRegistryContext value={objectTextStyleDefaults}>
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
				</ObjectTextStyleDefaultsRegistryContext>
			</ObjectTextRegionRegistryContext>
		</ObjectComponentRegistryContext>
	);
}
