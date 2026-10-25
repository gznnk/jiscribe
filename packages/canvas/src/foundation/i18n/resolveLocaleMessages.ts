/**
 * A dictionary keyed by locale tag. `en` is required so resolution always has a
 * final fallback and never returns undefined.
 */
export type LocaleMessages<T> = { en: T } & Record<string, T>;

/**
 * Picks the dictionary for a locale: exact match → language subtag
 * (`"ja-JP"` → `"ja"`) → `"en"`.
 */
export function resolveLocaleMessages<T>(
	dictByLocale: LocaleMessages<T>,
	locale: string,
): T {
	const exact = dictByLocale[locale];
	if (exact) {
		return exact;
	}
	const languageSubtag = locale.split("-")[0];
	const bySubtag = dictByLocale[languageSubtag];
	if (bySubtag) {
		return bySubtag;
	}
	return dictByLocale.en;
}

/**
 * Resolves a label declared outside React: a plain string is locale-agnostic and
 * returned as-is; a `LocaleMessages` dictionary is resolved for the locale.
 */
export function resolveLocalizedLabel(
	label: string | LocaleMessages<string>,
	locale: string,
): string {
	return typeof label === "string"
		? label
		: resolveLocaleMessages(label, locale);
}
