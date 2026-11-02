import { bench, describe } from "vitest";

import { buildConnectedDoc } from "../../ops/__benchmarks__/support/buildConnectedDoc";
import { createCanvasParser } from "../createCanvasParser";

const parser = createCanvasParser();

// What a host does on opening a file: the whole text, every stage.
describe("createCanvasParser: parse a document", () => {
	for (const shapeCount of [100, 1000, 5000]) {
		const { doc } = buildConnectedDoc({
			shapeCount,
			connectorCount: shapeCount,
		});
		const text = `${JSON.stringify(doc, null, "\t")}\n`;
		bench(`${shapeCount} shapes, ${shapeCount} connectors`, () => {
			const result = parser.parse(text);
			if (result.kind !== "ok") {
				throw new Error(`fixture failed to parse: ${result.kind}`);
			}
		});
	}
});
