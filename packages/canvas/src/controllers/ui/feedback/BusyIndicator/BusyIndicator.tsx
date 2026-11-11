import { IndicatorPill, IndicatorRing } from "./BusyIndicatorStyled";
import { useCanvasLocale } from "../../../../foundation/i18n/CanvasLocaleContext";
import {
	type LocaleMessages,
	resolveLocalizedLabel,
} from "../../../../foundation/i18n/resolveLocaleMessages";
import { TOOLBAR_PILL_BOTTOM } from "../../menu/floatingBarLayout";

/** Gap in px above the pill, below the toolbar in either of its forms. */
const INDICATOR_TOP_GAP = 8;

type BusyIndicatorProps = {
	/** `busyLabel` of the pending command, unresolved: nothing is rendered for null */
	busyLabel: string | LocaleMessages<string> | null;
	/** Which form the toolbar is in: collapsed, its pills float over the viewport's top corners */
	isChromeExpanded: boolean;
};

/**
 * Says a command is running, at the top centre of the canvas area. Rendered
 * for as long as the command is pending and invisible until its delay has
 * passed (see IndicatorPill).
 */
export const BusyIndicator = ({
	busyLabel,
	isChromeExpanded,
}: BusyIndicatorProps) => {
	const locale = useCanvasLocale();
	if (busyLabel === null) {
		return null;
	}
	return (
		<IndicatorPill
			role="status"
			style={{
				top: isChromeExpanded
					? INDICATOR_TOP_GAP
					: TOOLBAR_PILL_BOTTOM + INDICATOR_TOP_GAP,
			}}
		>
			<IndicatorRing />
			{resolveLocalizedLabel(busyLabel, locale)}
		</IndicatorPill>
	);
};
