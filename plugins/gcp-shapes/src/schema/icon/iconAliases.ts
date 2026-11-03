/**
 * Hand-written table from the short names a Google Cloud diagram is talked
 * about in (`gce`, `gcs`, `scc`), and from Google's official spellings that
 * differ from the asset folders' (`spanner`, `google-security-operations`), to
 * canonical names. No mechanical rule reaches them.
 *
 * A canonical name is left out, as is a product without an icon of its own:
 * GCP_GENERAL_PRODUCT_ICONS sends those to their category's icon. A test holds
 * every target to an icon that exists, every alias to a spelling that would
 * not resolve without it, and the two tables to keys of their own.
 */
export const GCP_ICON_ALIASES: Readonly<Record<string, string>> = {
	"ai-and-machine-learning": "ai-machine-learning",
	"ai-applications": "agents",
	"ai-applications-agents": "agents",
	"ai-ml": "ai-machine-learning",
	chronicle: "security-operations",
	gce: "compute-engine",
	gcs: "cloud-storage",
	gdc: "distributed-cloud",
	"google-cloud-marketplace": "marketplace",
	"google-distributed-cloud": "distributed-cloud",
	"google-kubernetes-engine": "gke",
	"google-security-operations": "security-operations",
	"google-threat-intelligence": "threat-intelligence",
	"hybrid-and-multicloud": "hybrid-multicloud",
	"kubernetes-engine": "gke",
	"machine-learning": "ai-machine-learning",
	maps: "maps-geospatial",
	"maps-and-geospatial": "maps-geospatial",
	// Google's overview: "Hyperdisk (previously Persistent Disk)".
	"persistent-disk": "hyperdisk",
	scc: "security-command-center",
	secops: "security-operations",
	"security-and-identity": "security-identity",
	serverless: "serverless-computing",
	spanner: "cloud-spanner",
	// Google's overview lists a bare "SQL" among the databases; it means Cloud SQL.
	sql: "cloud-sql",
	"web-and-mobile": "web-mobile",
};
