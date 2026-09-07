/**
 * Hand-written table from the short names people say to canonical ones. The
 * spellings an AWS diagram is talked about in (`s3`, `alb`, `igw`) are nothing
 * like the official names, so no mechanical rule such as dropping a prefix
 * reaches them.
 *
 * The spellings that are mechanically derivable — the `amazon-` / `aws-` prefix
 * dropped, the layer prefix left off — are resolved by resolveAwsIconName
 * wherever they are unambiguous, and so are not listed here.
 *
 * A test holds every target against an icon that exists.
 */
export const AWS_ICON_ALIASES: Readonly<Record<string, string>> = {
	alb: "resource/elastic-load-balancing/application-load-balancer",
	"api-gateway": "service/amazon-api-gateway",
	athena: "service/amazon-athena",
	aurora: "service/amazon-aurora",
	bedrock: "service/amazon-bedrock",
	cloudformation: "service/aws-cloudformation",
	cloudfront: "service/amazon-cloudfront",
	cloudtrail: "service/aws-cloudtrail",
	cloudwatch: "service/amazon-cloudwatch",
	cognito: "service/amazon-cognito",
	dynamodb: "service/amazon-dynamodb",
	ebs: "service/amazon-elastic-block-store",
	ec2: "service/amazon-ec2",
	ecr: "service/amazon-elastic-container-registry",
	ecs: "service/amazon-elastic-container-service",
	efs: "service/amazon-efs",
	eks: "service/amazon-elastic-kubernetes-service",
	elasticache: "service/amazon-elasticache",
	elb: "service/elastic-load-balancing",
	eventbridge: "service/amazon-eventbridge",
	glb: "resource/elastic-load-balancing/gateway-load-balancer",
	glue: "service/aws-glue",
	iam: "service/aws-identity-and-access-management",
	igw: "resource/amazon-vpc/internet-gateway",
	kinesis: "service/amazon-kinesis-data-streams",
	kms: "service/aws-key-management-service",
	lambda: "service/aws-lambda",
	msk: "service/amazon-managed-streaming-for-apache-kafka",
	nat: "resource/amazon-vpc/nat-gateway",
	nlb: "resource/elastic-load-balancing/network-load-balancer",
	rds: "service/amazon-rds",
	redshift: "service/amazon-redshift",
	route53: "service/amazon-route-53",
	s3: "service/amazon-simple-storage-service",
	sagemaker: "service/amazon-sagemaker",
	ses: "service/amazon-simple-email-service",
	sns: "service/amazon-simple-notification-service",
	sqs: "service/amazon-simple-queue-service",
	"step-functions": "service/aws-step-functions",
	vpc: "service/amazon-virtual-private-cloud",
	waf: "service/aws-waf",
};
