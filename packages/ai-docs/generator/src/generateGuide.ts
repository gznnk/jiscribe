import type { ObjectDocDefinition } from "@workspace/canvas/doc";

import { CANONICAL_TYPE_ORDER, type CanonicalType } from "./manifest";
import { replaceAutogenRegion } from "./markdownRegions";
import { SPECIAL_TABLE_CELLS, deriveGuideStyles } from "./tableCells";

/** Generate the "Object quick reference" table of ai-guide.md and replace its AUTOGEN region. */
export function generateGuide(
	currentGuide: string,
	manifest: ReadonlyMap<CanonicalType, ObjectDocDefinition>,
): string {
	const rows = CANONICAL_TYPE_ORDER.map((type) => {
		const definition = manifest.get(type)!;
		const special = SPECIAL_TABLE_CELLS[type];
		const typeCell = special?.guideTypeCell ?? `\`${type}\``;
		const geometry =
			special?.guideGeometry ??
			(definition.features.geometry === "ellipse"
				? "`cx`,`cy`,`rx`,`ry`"
				: "`x`,`y`,`width`,`height`");
		const styles = special?.guideStyles ?? deriveGuideStyles(definition);
		return `| ${typeCell} | ${geometry} | ${styles} | ${definition.summary} |`;
	});

	const table = [
		"| `type` | Required geometry | Main styles | Use |",
		"| ------ | ----------------- | ----------- | --- |",
		...rows,
	].join("\n");

	return replaceAutogenRegion(currentGuide, "object-quick-reference", table);
}
