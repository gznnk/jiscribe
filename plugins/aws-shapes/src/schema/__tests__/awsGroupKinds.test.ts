import { describe, expect, it } from "vitest";

import {
	AWS_GROUP_KINDS,
	DEFAULT_AWS_GROUP_KIND,
	isAwsGroupKind,
} from "../AwsGroupDoc";
import { AWS_GROUP_KIND_STYLES, readAwsGroupKindStyle } from "../awsGroupKinds";
import { AWS_ICON_ENTRIES } from "../icon/iconData.generated";

describe("AWS_GROUP_KIND_STYLES", () => {
	it("names a corner icon that exists wherever it names one", () => {
		const dangling = Object.entries(AWS_GROUP_KIND_STYLES).filter(
			([, style]) =>
				style.cornerIcon !== undefined &&
				AWS_ICON_ENTRIES[style.cornerIcon] === undefined,
		);
		expect(dangling).toEqual([]);
	});

	it("covers every kind", () => {
		expect(Object.keys(AWS_GROUP_KIND_STYLES).sort()).toEqual(
			[...AWS_GROUP_KINDS].sort(),
		);
	});
});

describe("readAwsGroupKindStyle", () => {
	it("answers the kind's own style", () => {
		expect(readAwsGroupKindStyle("vpc")).toBe(AWS_GROUP_KIND_STYLES.vpc);
		expect(readAwsGroupKindStyle("region").strokeDashType).toBe("dotted");
	});

	it("falls back to the default kind for an omitted or unknown value", () => {
		const fallback = AWS_GROUP_KIND_STYLES[DEFAULT_AWS_GROUP_KIND];
		expect(readAwsGroupKindStyle(undefined)).toBe(fallback);
		expect(readAwsGroupKindStyle("subnet")).toBe(fallback);
	});
});

describe("isAwsGroupKind", () => {
	it("accepts the nineteen kinds and nothing else", () => {
		expect(AWS_GROUP_KINDS.every(isAwsGroupKind)).toBe(true);
		expect(isAwsGroupKind("subnet")).toBe(false);
		expect(isAwsGroupKind(undefined)).toBe(false);
		expect(isAwsGroupKind(1)).toBe(false);
	});
});
