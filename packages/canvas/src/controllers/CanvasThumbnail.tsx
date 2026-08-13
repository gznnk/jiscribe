import { memo, useMemo, useRef, useState } from "react";

import { createCanvasRegistries, defaultCanvasRegistries } from "./registries";
import { calcFitViewport } from "./utils/calcFitViewport";
import type { CanvasPlugin } from "../plugin/CanvasPlugin";
import { CanvasView } from "../presentations/CanvasView";
import { PresentationRegistriesProvider } from "../presentations/objects/registry/PresentationRegistriesProvider";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";
import { canvasToState } from "../states/canvas/CanvasMapper";
import type { CanvasTheme } from "../theme/CanvasTheme";
import { CanvasThemeContext } from "../theme/CanvasThemeContext";
import { buildThemeCssVars } from "../theme/themeCssVars";
import { darkCanvasTheme } from "../theme/themePresets";

type CanvasThumbnailProps = {
	/**
	 * The CanvasDoc to display. As with `Canvas`, pass a valid doc that has gone
	 * through `createCanvasParser` (two-stage validation); it is not re-validated
	 * internally (see docs/01 principle 4).
	 */
	canvasDoc: CanvasDoc;
	/** SVG width (logical px based on viewBox). Baseline value assuming CSS scaling. */
	width?: number;
	/** SVG height (logical px). The ratio to width sets the thumbnail's aspect ratio. */
	height?: number;
	/** Margin (px) kept around the content. */
	padding?: number;
	/** Theme injected by the host (default: `darkCanvasTheme`). See the Canvas `theme` prop. */
	theme?: CanvasTheme;
	/**
	 * Plugins whose object types the doc may reference. Read once at mount; later
	 * changes are ignored (see the Canvas `initialConfig` prop doc). Without them,
	 * plugin-supplied objects have no mapper and `canvasToState` throws.
	 */
	plugins?: readonly CanvasPlugin[];
};

/**
 * Read-only canvas that statically renders a doc so the whole thing fits.
 *
 * Has neither a reducer nor gestures; it simply feeds the doc into the
 * display-only {@link CanvasView}. Used for lightweight, high-fidelity,
 * non-interactive displays such as gallery thumbnails.
 */
const CanvasThumbnailComponent: React.FC<CanvasThumbnailProps> = ({
	canvasDoc,
	width = 480,
	height = 270,
	padding = 24,
	theme = darkCanvasTheme,
	plugins,
}) => {
	const svgRef = useRef<SVGSVGElement>(null);

	// Configured bundle when `plugins` is given, otherwise the shared full
	// default. Built once at mount (see the `plugins` prop doc).
	const [registries] = useState(() =>
		plugins ? createCanvasRegistries({ plugins }) : defaultCanvasRegistries,
	);

	const { objects, rootIds, background } = useMemo(
		() =>
			canvasToState(
				canvasDoc,
				registries.objectMapper,
				registries.objectContentResizer,
				theme.fontFamily,
			),
		[canvasDoc, registries, theme.fontFamily],
	);

	const viewport = useMemo(
		() =>
			calcFitViewport(
				objects,
				{ width, height, padding },
				registries.objectVisualBounds,
			) ?? {
				minX: 0,
				minY: 0,
				width,
				height,
				zoom: 1,
			},
		[objects, width, height, padding, registries],
	);

	// display: contents keeps the thumbnail out of layout while still letting
	// the --jiscribe-* custom properties inherit into the CanvasView styles.
	const themeCssVars = useMemo(
		() => ({ display: "contents", ...buildThemeCssVars(theme.tokens) }),
		[theme],
	);

	return (
		<CanvasThemeContext value={theme}>
			<PresentationRegistriesProvider
				objectComponent={registries.objectComponent}
				objectTextRegion={registries.objectTextRegion}
				objectOutline={registries.objectOutline}
				objectAnchorRegion={registries.objectAnchorRegion}
				objectExtraConnectPoints={registries.objectExtraConnectPoints}
				objectGeometryKey={registries.objectGeometryKey}
				objectSvgDefs={registries.objectSvgDefs}
			>
				<div style={themeCssVars}>
					<CanvasView
						objects={objects}
						rootIds={rootIds}
						viewport={viewport}
						svgRef={svgRef}
						background={background}
						surfaceColor={theme.tokens.canvasBg}
					/>
				</div>
			</PresentationRegistriesProvider>
		</CanvasThemeContext>
	);
};

export const CanvasThumbnail = memo(CanvasThumbnailComponent);
