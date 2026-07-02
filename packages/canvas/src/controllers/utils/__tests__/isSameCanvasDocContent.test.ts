import { describe, it, expect } from "vitest";

import type { CanvasDoc } from "../../../schemas/canvas/CanvasDoc";
import { isSameCanvasDocContent } from "../isSameCanvasDocContent";

// Match the real input path (file -> JSON.parse) by building the doc from a JSON string.
// This lets each test tightly control the key insertion order.
const parseDoc = (json: string): CanvasDoc => JSON.parse(json) as CanvasDoc;

const rectJson = `{
	"id": "rect-1",
	"type": "rect",
	"x": 10,
	"y": 20,
	"width": 100,
	"height": 50
}`;

describe("isSameCanvasDocContent", () => {
	it("docs with identical content (different instances) are judged the same", () => {
		const docA = parseDoc(`{ "version": 1, "root": [${rectJson}] }`);
		const docB = parseDoc(`{ "version": 1, "root": [${rectJson}] }`);
		expect(isSameCanvasDocContent(docA, docB)).toBe(true);
	});

	it("judged different when an object's property value differs", () => {
		const docA = parseDoc(`{ "version": 1, "root": [${rectJson}] }`);
		const docB = parseDoc(
			`{ "version": 1, "root": [${rectJson.replace('"x": 10', '"x": 11')}] }`,
		);
		expect(isSameCanvasDocContent(docA, docB)).toBe(false);
	});

	it("judged different when the number of root elements differs", () => {
		const docA = parseDoc(`{ "version": 1, "root": [${rectJson}] }`);
		const docB = parseDoc(`{ "version": 1, "root": [] }`);
		expect(isSameCanvasDocContent(docA, docB)).toBe(false);
	});

	it("the presence or difference of $schema does not affect the comparison", () => {
		const docA = parseDoc(
			`{ "$schema": "./jiscribe.schema.json", "version": 1, "root": [] }`,
		);
		const docB = parseDoc(`{ "version": 1, "root": [] }`);
		expect(isSameCanvasDocContent(docA, docB)).toBe(true);
	});

	it("a difference in top-level key order does not affect the comparison", () => {
		const docA = parseDoc(`{ "root": [${rectJson}], "version": 1 }`);
		const docB = parseDoc(`{ "version": 1, "root": [${rectJson}] }`);
		expect(isSameCanvasDocContent(docA, docB)).toBe(true);
	});

	it("differing key order within an object is judged different even if content matches (known false negative)", () => {
		// This behavior is by design: callers use it only for a "skip if identical" optimization,
		// so a false negative fails safe (processing runs as before).
		const docA = parseDoc(
			`{ "version": 1, "root": [{ "id": "rect-1", "type": "rect" }] }`,
		);
		const docB = parseDoc(
			`{ "version": 1, "root": [{ "type": "rect", "id": "rect-1" }] }`,
		);
		expect(isSameCanvasDocContent(docA, docB)).toBe(false);
	});
});
