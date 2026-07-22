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
