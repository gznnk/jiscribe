import type { IconSetPaletteEntry } from "@jiscribe/canvas-sdk/doc";

/**
 * The icons the palette carries (tier 1): each core product next to the
 * category icon the rest of its category is drawn with, compute first. Of the
 * 45, Media Services, Mixed Reality and Collaboration are left to the stencil
 * library's search and its "show all" view, so the length stays a multiple of
 * the library grid's columns (`STENCIL_LIBRARY_PANEL_GRID_COLUMNS` in canvas)
 * and the section ends on a full row.
 *
 * Each label is the catalog's, Google's official name (a test holds them
 * equal). It serves as both the stencil's tooltip and the label the placed
 * shape carries.
 */
export const GCP_TIER1_ICONS = [
	{ icon: "compute-engine", label: "Compute Engine" },
	{ icon: "compute", label: "Compute" },
	{ icon: "cloud-run", label: "Cloud Run" },
	{ icon: "serverless-computing", label: "Serverless Computing" },
	{ icon: "gke", label: "GKE" },
	{ icon: "containers", label: "Containers" },
	{ icon: "cloud-storage", label: "Cloud Storage" },
	{ icon: "hyperdisk", label: "Hyperdisk" },
	{ icon: "storage", label: "Storage" },
	{ icon: "alloydb", label: "AlloyDB" },
	{ icon: "cloud-sql", label: "Cloud SQL" },
	{ icon: "cloud-spanner", label: "Spanner" },
	{ icon: "databases", label: "Databases" },
	{ icon: "bigquery", label: "BigQuery" },
	{ icon: "data-analytics", label: "Data Analytics" },
	{ icon: "looker", label: "Looker" },
	{ icon: "business-intelligence", label: "Business Intelligence" },
	{ icon: "vertex-ai", label: "Vertex AI" },
	{ icon: "ai-hypercomputer", label: "AI Hypercomputer" },
	{ icon: "ai-machine-learning", label: "AI / Machine Learning" },
	{ icon: "agents", label: "AI Applications & Agents" },
	{ icon: "networking", label: "Networking" },
	{ icon: "security-identity", label: "Security Identity" },
	{ icon: "security-command-center", label: "Security Command Center" },
	{ icon: "security-operations", label: "Google Security Operations" },
	{ icon: "threat-intelligence", label: "Google Threat Intelligence" },
	{ icon: "mandiant", label: "Mandiant" },
	{ icon: "apigee", label: "Apigee" },
	{ icon: "integration-services", label: "Integration Services" },
	{ icon: "developer-tools", label: "Developer Tools" },
	{ icon: "devops", label: "DevOps" },
	{ icon: "observability", label: "Observability" },
	{ icon: "operations", label: "Operations" },
	{ icon: "management-tools", label: "Management Tools" },
	{ icon: "anthos", label: "Anthos" },
	{ icon: "distributed-cloud", label: "Google Distributed Cloud" },
	{ icon: "hybrid-multicloud", label: "Hybrid & Multicloud" },
	{ icon: "migration", label: "Migration" },
	{ icon: "maps-geospatial", label: "Maps & Geospatial" },
	{ icon: "marketplace", label: "Google Cloud Marketplace" },
	{ icon: "web-mobile", label: "Web & Mobile" },
	{ icon: "web3", label: "Web3" },
] as const satisfies readonly IconSetPaletteEntry[];

/** The names of {@link GCP_TIER1_ICONS} alone, in the same order. */
export const GCP_TIER1_ICON_NAMES: readonly string[] = GCP_TIER1_ICONS.map(
	(entry) => entry.icon,
);
