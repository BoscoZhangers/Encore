import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
const directory = () => path.resolve(process.env.DATA_DIR || 'data', 'photos');
const s3 = () =>
  new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: !!process.env.S3_ENDPOINT,
  });
export async function storePhoto(id: string, buffer: Buffer) {
  const image = await sharp(buffer, { limitInputPixels: 25000000 })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
  if (process.env.S3_BUCKET) {
    await s3().send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: `photos/${id}.webp`,
        Body: image,
        ContentType: 'image/webp',
      }),
    );
    return 's3';
  }
  await mkdir(directory(), { recursive: true });
  await writeFile(path.join(directory(), `${id}.webp`), image);
  return 'local';
}
export async function readPhoto(id: string, storage: string) {
  if (storage === 's3') {
    const result = await s3().send(
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: `photos/${id}.webp` }),
    );
    return Buffer.from(await result.Body!.transformToByteArray());
  }
  return readFile(path.join(directory(), `${id}.webp`));
}
export async function deletePhoto(id: string, storage: string) {
  if (storage === 's3')
    await s3().send(
      new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: `photos/${id}.webp` }),
    );
  else await unlink(path.join(directory(), `${id}.webp`)).catch(() => {});
}
