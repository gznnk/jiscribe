import type { StencilIconProps } from "@jiscribe/canvas";
import { createStencilIcon } from "@jiscribe/canvas-sdk";
import type { NamedExoticComponent } from "react";
import { createElement } from "react";

import { ICON_NODES } from "../schema/icon/iconData.generated";

/**
 * Builds the palette glyph for one icon out of the bundled drawing, so a palette entry can
 * only ever show an icon the set actually has.
 *
 * @param name - Current name of the icon; one that resolves to nothing draws nothing
 * @returns The memoized icon component a `Stencil` takes
 */
export const createLucideStencilIcon = (
	name: string,
): NamedExoticComponent<StencilIconProps> =>
	createStencilIcon(
		<g
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			{(ICON_NODES[name] ?? []).map(([tag, attrs], index) =>
				createElement(tag, { key: index, ...attrs }),
			)}
		</g>,
	);
