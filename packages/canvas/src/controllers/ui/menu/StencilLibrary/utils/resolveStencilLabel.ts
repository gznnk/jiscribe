import type { CanvasMessages } from "../../../../messages/CanvasMessagesTypes";
import type { LocaleMessages } from "../../../../messages/resolveLocaleMessages";
import { resolveLocalizedLabel } from "../../../../messages/resolveLocaleMessages";
import type { Stencil } from "../../../objects/Stencil";

/**
 * Display label of a stencil: the host override (`messages.stencilLabels[id]`)
 * first, then the label the stencil itself carries, resolved for `locale`.
 */
export const resolveStencilLabel = (
	preset: Stencil,
	messages: CanvasMessages,
	locale: string,
): string =>
	messages.stencilLabels[preset.id] ??
	resolveLocalizedLabel(preset.label, locale);

/**
 * Display label of a stencil category (toolbar flyout or sidebar section): the
 * host override (`messages.stencilCategoryLabels[id]`) first, then the label
 * the category declaration carries, resolved for `locale`.
 */
export const resolveStencilCategoryLabel = (
	categoryId: string,
	label: string | LocaleMessages<string>,
	messages: CanvasMessages,
	locale: string,
): string =>
	messages.stencilCategoryLabels[categoryId] ??
	resolveLocalizedLabel(label, locale);
