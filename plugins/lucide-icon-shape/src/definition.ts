import type {
	ObjectTypeDefinition,
	PropertyPanelSection,
} from "@jiscribe/canvas";
import {
	createDefaultPropertyPanel,
	createFrameObjectDefinition,
} from "@jiscribe/canvas-sdk";

import { lucideIconDocDefinition } from "./doc";
import { IconPickerMenu } from "./menu/IconPickerMenu";
import { lucideIconPropertySectionLabelByLocale } from "./messages/lucideIconMessages";
import { Icon } from "./presentation/Icon";
import { IconProperty } from "./propertyPanel/IconProperty";
import { isKnownIconName } from "./schema/icon/resolveIconName";
import type { IconDoc } from "./schema/IconDoc";
import type { IconState } from "./state/IconState";
import { IconStencils } from "./stencil/IconStencils";
import { ICON_STYLE_ENTRIES } from "./style/iconStyleEntries";

/**
 * Id of the icon section of the sidebar and of the row it holds. Spelled for
 * lucide alone: the sidebar merges a multi-type selection's rows by id, so a row
 * another icon shape names the same would be drawn as one with this.
 */
const LUCIDE_ICON_PROPERTY_SECTION_ID = "lucideIcon";

/** An icon section, then the sections the features derive. */
const LUCIDE_ICON_PROPERTY_PANEL: PropertyPanelSection[] = [
	{
		id: LUCIDE_ICON_PROPERTY_SECTION_ID,
		label: lucideIconPropertySectionLabelByLocale,
		items: [
			{
				type: "custom",
				id: LUCIDE_ICON_PROPERTY_SECTION_ID,
				component: IconProperty,
			},
		],
	},
	...createDefaultPropertyPanel(lucideIconDocDefinition.features),
];

/**
 * The menu adds the icon picker to what features would derive on their own: `stroke`
 * without `fill` yields the line color and line style the icon is drawn with. The picker
 * writes `icon`, which the type declares in its own style table (ICON_STYLE_ENTRIES).
 *
 * The sidebar leads with the icon section (LUCIDE_ICON_PROPERTY_PANEL), so a host
 * that hides the ObjectMenu can still change the icon.
 */
export const lucideIconDefinition: ObjectTypeDefinition<IconDoc, IconState> =
	createFrameObjectDefinition<IconDoc, IconState>({
		doc: lucideIconDocDefinition,
		component: Icon,
		// The same resolution the doc validator applies, so a name that could not be
		// written to a document cannot reach the renderer through a state either.
		isExtraStateValid: (state) =>
			state.icon === undefined ||
			(typeof state.icon === "string" && isKnownIconName(state.icon)),
		styleEntries: ICON_STYLE_ENTRIES,
		stencils: IconStencils,
		propertyPanel: LUCIDE_ICON_PROPERTY_PANEL,
		menu: [
			{
				id: "lucide-icon",
				items: [{ type: "custom", id: "icon", component: IconPickerMenu }],
			},
			{ id: "line", items: [{ type: "lineColor" }, { type: "lineStyle" }] },
		],
	});
