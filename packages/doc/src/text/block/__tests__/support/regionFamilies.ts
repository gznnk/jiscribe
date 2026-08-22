import type { RichText } from "../../../../model/objects/types/RichText";
import type { ObjectDocTextRegionCalculator } from "../../../../plugin/ObjectDocTextRegion";
import {
	calcFullBoxTextRegion,
	calcOutsideBoxTextRegion,
} from "../../../../plugin/ObjectDocTextRegion";

/** Region insetting each side by a constant fraction of the box, as most shipped types declare theirs. */
const insetRegion =
	(insets: {
		top?: number;
		right?: number;
		bottom?: number;
		left?: number;
	}): ObjectDocTextRegionCalculator =>
	({ width, height }) => {
		const left = width * (insets.left ?? 0);
		const right = width * (insets.right ?? 0);
		const top = height * (insets.top ?? 0);
		const bottom = height * (insets.bottom ?? 0);
		return {
			x: -width / 2 + left,
			y: -height / 2 + top,
			width: width - left - right,
			height: height - top - bottom,
		};
	};

/**
 * One region per shape of region the shipped set declares, named after the types
 * that declare it. The first four keep their width whatever the height does; the
 * rest do not, which is the case the height search has to keep answering the
 * same way as an exhaustive walk.
 */
export const REGION_FAMILIES: readonly {
	name: string;
	textRegion: ObjectDocTextRegionCalculator;
}[] = [
	{ name: "whole box (rect, sticky, note)", textRegion: calcFullBoxTextRegion },
	{
		name: "constant inset on every side (diamond, ellipse)",
		textRegion: insetRegion({
			top: 0.25,
			right: 0.25,
			bottom: 0.25,
			left: 0.25,
		}),
	},
	{
		name: "constant side caps (hexagon, subroutine, trapezoid)",
		textRegion: insetRegion({ left: 0.125, right: 0.125 }),
	},
	{
		name: "constant top and bottom bands (db, document)",
		textRegion: insetRegion({ top: 0.2, bottom: 0.1 }),
	},
	{
		name: "corner cut off the shorter side (card, loop limit)",
		textRegion: ({ width, height }) => {
			const cut = Math.min(width, height) * 0.2;
			return {
				x: -width / 2,
				y: -height / 2 + cut,
				width,
				height: height - cut,
			};
		},
	},
	{
		name: "sheet offsets off the shorter side (multi document)",
		textRegion: ({ width, height }) => {
			const offset = Math.min(width, height) * 0.08;
			return {
				x: -width / 2,
				y: -height / 2 + offset * 2,
				width: width - offset * 2,
				height: (height - offset * 2) * 0.9,
			};
		},
	},
	{
		name: "cap radius off the height (delay)",
		textRegion: ({ width, height }) => ({
			x: -width / 2,
			y: -height / 2,
			width: Math.max(0, width - height / 2),
			height,
		}),
	},
	{
		name: "caps on the longer axis (stadium)",
		textRegion: ({ width, height }) => {
			const capRadius = Math.min(width, height) / 2;
			return width >= height
				? {
						x: -width / 2 + capRadius,
						y: -height / 2,
						width: width - capRadius * 2,
						height,
					}
				: {
						x: -width / 2,
						y: -height / 2 + capRadius,
						width,
						height: height - capRadius * 2,
					};
		},
	},
	{
		name: "header band of a stated height (container)",
		textRegion: (doc) => ({
			x: -doc.width / 2,
			y: -doc.height / 2,
			width: doc.width,
			height: (doc as { headerHeight?: number }).headerHeight ?? 32,
		}),
	},
	{
		name: "no region at all (actor, cross)",
		textRegion: calcOutsideBoxTextRegion,
	},
];

/** Texts spanning what decides a break: nothing, one word, wrapping, CJK, authored lines, mixed runs. */
export const MATRIX_TEXTS: readonly { name: string; text: RichText }[] = [
	{ name: "empty", text: "" },
	{ name: "one word", text: "Label" },
	{
		name: "long ascii",
		text: "aaaa bbbb cccc dddd eeee ffff gggg hhhh iiii jjjj kkkk llll",
	},
	{ name: "cjk", text: "大量のテキストを読み込ませて折り返しを起こす" },
	{ name: "authored lines", text: "first line\n\nthird line\nfourth" },
	{
		name: "mixed runs",
		text: [
			{ text: "small " },
			{ text: "LARGE ", fontSize: 24 },
			{ text: "another family", fontFamily: "Noto Serif JP" },
		],
	},
];
