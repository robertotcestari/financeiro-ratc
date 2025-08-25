import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export function getS3Config() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION;
  const bucket = process.env.S3_BUCKET;
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL; // optional

  if (!accessKeyId || !secretAccessKey || !region || !bucket) return null;

  const client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  return { client, region, bucket, publicBaseUrl };
}

export async function uploadPdfToS3(params: {
  key: string;
  body: Buffer | Uint8Array;
  contentType?: string;
}) {
  const cfg = getS3Config();
  if (!cfg) throw new Error('S3 config missing');

  const { client, bucket, region, publicBaseUrl } = cfg;
  const { key, body, contentType = 'application/pdf' } = params;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  const s3Uri = `s3://${bucket}/${key}`;
  const url = publicBaseUrl
    ? `${publicBaseUrl.replace(/\/$/, '')}/${key}`
    : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

  return { s3Uri, url, key, bucket };
}
