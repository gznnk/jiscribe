import type { ObjectShapeStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectShapeStyleDefaultsRegistry";
import type { ObjectTextStyleDefaultsRegistry } from "@jiscribe/doc/registries/ObjectTextStyleDefaultsRegistry";
import type { ReactNode } from "react";

import type { ObjectAnchorRegionRegistry } from "./ObjectAnchorRegionRegistry";
import { ObjectAnchorRegionRegistryContext } from "./ObjectAnchorRegionRegistryContext";
import type { ObjectComponentRegistry } from "./ObjectComponentRegistry";
import { ObjectComponentRegistryContext } from "./ObjectComponentRegistryContext";
import type { ObjectConnectionAnchorOffsetsRegistry } from "./ObjectConnectionAnchorOffsetsRegistry";
import { ObjectConnectionAnchorOffsetsRegistryContext } from "./ObjectConnectionAnchorOffsetsRegistryContext";
import type { ObjectExtraConnectPointsRegistry } from "./ObjectExtraConnectPointsRegistry";
import { ObjectExtraConnectPointsRegistryContext } from "./ObjectExtraConnectPointsRegistryContext";
import type { ObjectGeometryKeyRegistry } from "./ObjectGeometryKeyRegistry";
import { ObjectGeometryKeyRegistryContext } from "./ObjectGeometryKeyRegistryContext";
import type { ObjectOutlineRegistry } from "./ObjectOutlineRegistry";
import { ObjectOutlineRegistryContext } from "./ObjectOutlineRegistryContext";
import type { ObjectPartKindRegistry } from "./ObjectPartKindRegistry";
import { ObjectPartKindRegistryContext } from "./ObjectPartKindRegistryContext";
import { ObjectShapeStyleDefaultsRegistryContext } from "./ObjectShapeStyleDefaultsRegistryContext";
import type { ObjectSvgDefsRegistry } from "./ObjectSvgDefsRegistry";
import { ObjectSvgDefsRegistryContext } from "./ObjectSvgDefsRegistryContext";
import { ObjectTextStyleDefaultsRegistryContext } from "./ObjectTextStyleDefaultsRegistryContext";

type RenderingRegistriesProviderProps = {
	objectComponent: ObjectComponentRegistry;
	objectPartKind: ObjectPartKindRegistry;
	objectTextStyleDefaults: ObjectTextStyleDefaultsRegistry;
	objectShapeStyleDefaults: ObjectShapeStyleDefaultsRegistry;
	objectOutline: ObjectOutlineRegistry;
	objectAnchorRegion: ObjectAnchorRegionRegistry;
	objectExtraConnectPoints: ObjectExtraConnectPointsRegistry;
	objectConnectionAnchorOffsets: ObjectConnectionAnchorOffsetsRegistry;
	objectGeometryKey: ObjectGeometryKeyRegistry;
	objectSvgDefs: ObjectSvgDefsRegistry;
	children: ReactNode;
};

/**
 * Bundles the rendering-layer registry contexts so `Canvas` can provide them
 * in one node instead of a nested stack. Takes
 * the registries individually rather than the controllers-layer
 * `CanvasRegistries` bundle (docs/02-architecture.md layering).
 */
export function RenderingRegistriesProvider({
	objectComponent,
	objectPartKind,
	objectTextStyleDefaults,
	objectShapeStyleDefaults,
	objectOutline,
	objectAnchorRegion,
	objectExtraConnectPoints,
	objectConnectionAnchorOffsets,
	objectGeometryKey,
	objectSvgDefs,
	children,
}: RenderingRegistriesProviderProps) {
	return (
		<ObjectComponentRegistryContext value={objectComponent}>
			<ObjectPartKindRegistryContext value={objectPartKind}>
				<ObjectTextStyleDefaultsRegistryContext value={objectTextStyleDefaults}>
					<ObjectShapeStyleDefaultsRegistryContext
						value={objectShapeStyleDefaults}
					>
						<ObjectOutlineRegistryContext value={objectOutline}>
							<ObjectAnchorRegionRegistryContext value={objectAnchorRegion}>
								<ObjectExtraConnectPointsRegistryContext
									value={objectExtraConnectPoints}
								>
									<ObjectConnectionAnchorOffsetsRegistryContext
										value={objectConnectionAnchorOffsets}
									>
										<ObjectGeometryKeyRegistryContext value={objectGeometryKey}>
											<ObjectSvgDefsRegistryContext value={objectSvgDefs}>
												{children}
											</ObjectSvgDefsRegistryContext>
										</ObjectGeometryKeyRegistryContext>
									</ObjectConnectionAnchorOffsetsRegistryContext>
								</ObjectExtraConnectPointsRegistryContext>
							</ObjectAnchorRegionRegistryContext>
						</ObjectOutlineRegistryContext>
					</ObjectShapeStyleDefaultsRegistryContext>
				</ObjectTextStyleDefaultsRegistryContext>
			</ObjectPartKindRegistryContext>
		</ObjectComponentRegistryContext>
	);
}
