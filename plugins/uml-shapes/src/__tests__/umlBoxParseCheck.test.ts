import type { ParseCheckDoc } from "@jiscribe/canvas-sdk/testing";
import { createParseCheckSuite } from "@jiscribe/canvas-sdk/testing";

import { umlDocPlugin } from "../doc";

const makeDoc = (packageText: unknown): ParseCheckDoc => ({
	version: 1,
	root: [
		{
			id: "p-1",
			type: "umlPackage",
			x: 0,
			y: 0,
			width: 160,
			height: 108,
			text: packageText,
		},
		{
			id: "c-1",
			type: "umlComponent",
			x: 300,
			y: 0,
			width: 160,
			height: 90,
			text: "PaymentGateway",
		},
		{
			id: "l-1",
			type: "connector",
			source: { owner: { id: "p-1" }, anchor: { kind: "center" } },
			target: { owner: { id: "c-1" }, anchor: { kind: "center" } },
			points: [],
		},
	],
});

// Parse through a plugin-aware parser so both box shapes are known to parse-time
// structure/semantic validation. The headless `umlDocPlugin` carries no React deps.
// `checkEveryRegisteredType` is not usable here: the plugin also registers record,
// whose text is a keyed object rather than a plain body.
createParseCheckSuite({
	name: "uml box shapes",
	plugin: umlDocPlugin,
	sampleDoc: makeDoc("Orders"),
	rejects: [
		{
			name: "diagnoses the keyed text form, which only a record takes",
			doc: makeDoc({ name: { text: "Orders" } }),
			diagnosticPaths: ["root[0].text"],
		},
	],
});
