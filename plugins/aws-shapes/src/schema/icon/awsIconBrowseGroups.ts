import { AWS_ICON_ENTRIES } from "./iconData.generated";
import { AWS_TIER1_ICON_NAMES } from "./tier1Icons";

/** One section of the AWS category's "show all" view, as declared. */
type AwsIconBrowseGroupDeclaration = {
	/** The label in kebab-case; unique among the groups. */
	id: string;
	/** English, as the set names it; not translated, like the icon labels. */
	label: string;
	/** The icon set's own category names (`AwsIconEntry.category`) the section holds. */
	categories: readonly string[];
};

/**
 * The sections of the "show all" view, in the order an architecture diagram
 * reaches for them rather than alphabetically. A category the set spells two
 * ways is folded into the one it duplicates. A test holds every category the
 * set has to exactly one section, so a new release adding one fails it.
 */
export const AWS_ICON_BROWSE_GROUP_DECLARATIONS: readonly AwsIconBrowseGroupDeclaration[] =
	[
		{ id: "compute", label: "Compute", categories: ["Compute"] },
		{ id: "containers", label: "Containers", categories: ["Containers"] },
		{ id: "storage", label: "Storage", categories: ["Storage"] },
		{ id: "databases", label: "Databases", categories: ["Databases"] },
		{
			id: "networking-content-delivery",
			label: "Networking Content Delivery",
			categories: ["Networking Content Delivery"],
		},
		{
			id: "application-integration",
			label: "Application Integration",
			categories: ["Application Integration"],
		},
		{
			id: "security-identity",
			label: "Security Identity",
			categories: ["Security Identity"],
		},
		{ id: "analytics", label: "Analytics", categories: ["Analytics"] },
		{
			id: "artificial-intelligence",
			label: "Artificial Intelligence",
			categories: ["Artificial Intelligence"],
		},
		{
			id: "developer-tools",
			label: "Developer Tools",
			categories: ["Developer Tools"],
		},
		{
			id: "management-governance",
			label: "Management Governance",
			categories: ["Management Governance", "Management Tools"],
		},
		{ id: "iot", label: "IoT", categories: ["IoT", "Internet of Things"] },
		{
			id: "migration-modernization",
			label: "Migration Modernization",
			categories: ["Migration Modernization"],
		},
		{
			id: "media-services",
			label: "Media Services",
			categories: ["Media Services"],
		},
		{
			id: "front-end-web-mobile",
			label: "Front End Web Mobile",
			categories: ["Front End Web Mobile"],
		},
		{
			id: "business-applications",
			label: "Business Applications",
			categories: ["Business Applications"],
		},
		{
			id: "end-user-computing",
			label: "End User Computing",
			categories: ["End User Computing"],
		},
		{
			id: "customer-enablement",
			label: "Customer Enablement",
			categories: ["Customer Enablement"],
		},
		{
			id: "cloud-financial-management",
			label: "Cloud Financial Management",
			categories: ["Cloud Financial Management"],
		},
		{
			id: "quantum-technologies",
			label: "Quantum Technologies",
			categories: ["Quantum Technologies"],
		},
		{ id: "blockchain", label: "Blockchain", categories: ["Blockchain"] },
		{ id: "games", label: "Games", categories: ["Games"] },
		{ id: "satellite", label: "Satellite", categories: ["Satellite"] },
		{
			id: "general",
			label: "General",
			categories: ["General", "General Icons"],
		},
		{ id: "group", label: "Group", categories: ["Group"] },
	];

/** One section of the "show all" view with the icons it holds. */
export type AwsIconBrowseGroup = {
	id: string;
	label: string;
	/** Canonical icon names, every layer included, palette members first (sortByPaletteFirst). */
	names: string[];
};

/**
 * Every section of the "show all" view in declaration order, each holding every
 * icon of its categories.
 */
export const listAwsIconBrowseGroups = (): AwsIconBrowseGroup[] =>
	AWS_ICON_BROWSE_GROUP_DECLARATIONS.map(({ id, label, categories }) => ({
		id,
		label,
		names: sortByPaletteFirst(
			Object.entries(AWS_ICON_ENTRIES)
				.filter(([, entry]) => categories.includes(entry.category))
				.map(([name]) => name),
		),
	}));

/** Where a name sits in the palette; the ones outside it share the rank past its end. */
const PALETTE_RANK_BY_NAME = new Map(
	AWS_TIER1_ICON_NAMES.map((name, index) => [name, index]),
);

/** Palette members first in the palette's order, then the rest alphabetically. */
const sortByPaletteFirst = (names: string[]): string[] =>
	[...names].sort(
		(left, right) =>
			paletteRank(left) - paletteRank(right) || left.localeCompare(right),
	);

/** The palette position, or one past its end for a name it does not carry. */
const paletteRank = (name: string): number =>
	PALETTE_RANK_BY_NAME.get(name) ?? AWS_TIER1_ICON_NAMES.length;

/** The AWS categories the icon set holds, alphabetically, each once. */
export const AWS_ICON_CATEGORIES: readonly string[] = [
	...new Set(Object.values(AWS_ICON_ENTRIES).map((entry) => entry.category)),
].sort((left, right) => left.localeCompare(right));
