/**
 * Replace the region between AUTOGEN markers
 * (<!-- AUTOGEN:BEGIN name --> / <!-- AUTOGEN:END name -->) with generated
 * content. Missing or duplicated markers throw, as they indicate a broken doc.
 */
export function replaceAutogenRegion(
	source: string,
	regionName: string,
	generatedContent: string,
): string {
	const begin = `<!-- AUTOGEN:BEGIN ${regionName} -->`;
	const end = `<!-- AUTOGEN:END ${regionName} -->`;
	const beginIndex = source.indexOf(begin);
	const endIndex = source.indexOf(end);
	if (beginIndex < 0 || endIndex < 0 || endIndex < beginIndex) {
		throw new Error(`AUTOGEN region "${regionName}" not found`);
	}
	if (source.indexOf(begin, beginIndex + 1) >= 0) {
		throw new Error(`AUTOGEN region "${regionName}" appears more than once`);
	}
	return `${source.slice(
		0,
		beginIndex + begin.length,
	)}\n\n${generatedContent.trim()}\n\n${source.slice(endIndex)}`;
}
