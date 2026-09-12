import { S3Client, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

export const BUCKET_NAME = process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME || 'studyasan-acms';

export const getBucketRegion = (bucketName: string): string => {
  if (bucketName === 'teacher-profiles') return 'ap-southeast-1';
  return process.env.AWS_REGION || 'us-east-1';
};

export const getS3Client = (bucketName: string = BUCKET_NAME): S3Client => {
  return new S3Client({
    region: getBucketRegion(bucketName),
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
};

interface UploadResult {
  url: string;
  key: string;
  filename: string;
}

// Get content type based on file extension
const getContentType = (filename: string): string => {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes: { [key: string]: string } = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.flac': 'audio/flac',
    '.wma': 'audio/x-ms-wma',
    '.opus': 'audio/opus',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',
    '.sql': 'application/sql',
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.xml': 'application/xml',
  };
  return contentTypes[ext] || 'application/octet-stream';
};

// Get file type category from filename
export const getFileType = (filename: string): string => {
  const ext = path.extname(filename).toLowerCase();
  
  if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'].includes(ext)) return 'image';
  if (['.mp4', '.webm', '.mov', '.avi', '.mkv'].includes(ext)) return 'video';
  if (['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma', '.opus'].includes(ext)) return 'audio';
  if (['.pdf'].includes(ext)) return 'pdf';
  if (['.doc', '.docx'].includes(ext)) return 'docx';
  if (['.ppt', '.pptx'].includes(ext)) return 'pptx';
  if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) return 'zip';
  if (['.txt', '.md'].includes(ext)) return 'text';
  
  return 'other';
};

// Upload a file to S3
export const uploadToS3 = async (
  file: Express.Multer.File,
  folder: string = 'modules'
): Promise<UploadResult> => {
  try {
    const fileExtension = path.extname(file.originalname);
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    const key = `${folder}/${uniqueFilename}`;
    const client = getS3Client(BUCKET_NAME);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: getContentType(file.originalname),
    });

    await client.send(command);

    // Generate public URL
    const region = getBucketRegion(BUCKET_NAME);
    const url = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;

    return {
      url,
      key,
      filename: file.originalname,
    };
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error('Failed to upload file to S3');
  }
};

// Upload a buffer directly to S3
export const uploadBufferToS3 = async (
  buffer: Buffer,
  key: string,
  contentType: string = 'application/octet-stream'
): Promise<UploadResult> => {
  try {
    const client = getS3Client(BUCKET_NAME);
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await client.send(command);

    const region = getBucketRegion(BUCKET_NAME);
    const url = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;

    return {
      url,
      key,
      filename: path.basename(key),
    };
  } catch (error) {
    console.error(`S3 Buffer Upload Error (${key}):`, error);
    throw new Error(`Failed to upload buffer to S3: ${key}`);
  }
};

// Upload multiple files to S3
export const uploadMultipleToS3 = async (
  files: Express.Multer.File[],
  folder: string = 'modules'
): Promise<UploadResult[]> => {
  try {
    const uploadPromises = files.map((file) => uploadToS3(file, folder));
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('S3 Multiple Upload Error:', error);
    throw new Error('Failed to upload files to S3');
  }
};

// Delete a file from S3
export const deleteFromS3 = async (key: string): Promise<void> => {
  try {
    if (!key) return;
    const client = getS3Client(BUCKET_NAME);
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await client.send(command);
  } catch (error: any) {
    console.error(`S3 Delete Error for key [${key}]:`, error?.message || error);
  }
};

// Delete multiple files from S3 in batches (S3 supports up to 1000 keys per DeleteObjects request)
export const deleteMultipleFromS3 = async (keys: string[]): Promise<number> => {
  const validKeys = Array.from(new Set(keys.filter((k) => typeof k === 'string' && k.trim().length > 0)));
  if (validKeys.length === 0) return 0;

  let totalDeleted = 0;
  const client = getS3Client(BUCKET_NAME);
  const batchSize = 1000;

  for (let i = 0; i < validKeys.length; i += batchSize) {
    const batch = validKeys.slice(i, i + batchSize);
    try {
      const command = new DeleteObjectsCommand({
        Bucket: BUCKET_NAME,
        Delete: {
          Objects: batch.map((Key) => ({ Key })),
          Quiet: true,
        },
      });
      await client.send(command);
      totalDeleted += batch.length;
    } catch (err: any) {
      console.warn(`[S3 Batch Delete] Fallback to individual deletion due to:`, err.message);
      for (const k of batch) {
        try {
          await deleteFromS3(k);
          totalDeleted++;
        } catch {}
      }
    }
  }

  return totalDeleted;
};

// Generate a presigned URL for temporary access (useful for private files)
export const generatePresignedUrl = async (
  key: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> => {
  try {
    const client = getS3Client(BUCKET_NAME);
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('Presigned URL Error:', error);
    throw new Error('Failed to generate presigned URL');
  }
};

// Extract S3 key from URL or path
export const extractS3KeyFromUrl = (url: string | null | undefined): string | null => {
  if (!url || typeof url !== 'string') return null;
  const cleaned = url.trim();
  if (!cleaned) return null;

  try {
    // If it's already a relative S3 path (e.g. "chat-attachments/abc.png" or "modules/xyz.pdf")
    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      // Remove any leading slash or query params
      const cleanPath = cleaned.replace(/^\/+/, '').split('?')[0];
      return cleanPath ? decodeURIComponent(cleanPath) : null;
    }

    const parsed = new URL(cleaned);
    let pathname = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');

    // Match 1: Virtual-hosted style (bucket.s3.region.amazonaws.com/key or bucket.s3.amazonaws.com/key)
    const host = parsed.hostname;
    if (host.includes(`${BUCKET_NAME}.s3`) || host.startsWith(`${BUCKET_NAME}.`)) {
      return pathname || null;
    }

    // Match 2: Path style (s3.region.amazonaws.com/bucket/key or s3.amazonaws.com/bucket/key)
    if (pathname.startsWith(`${BUCKET_NAME}/`)) {
      return pathname.substring(BUCKET_NAME.length + 1) || null;
    }

    // Match 3: Generic S3 / CDN URL containing known folder structure
    const knownFolders = [
      'modules',
      'chat-attachments',
      'test-questions',
      'test-answers',
      'homework-documents',
      'homework-responses',
      'homework-feedback',
      'brain-quest-documents',
      'brain-quest-submissions',
      'announcements',
      'profiles',
      'teacher-profiles',
      'recordings',
      'backups',
    ];

    for (const folder of knownFolders) {
      const folderIndex = pathname.indexOf(`${folder}/`);
      if (folderIndex !== -1) {
        return pathname.substring(folderIndex);
      }
    }

    return pathname || null;
  } catch (error) {
    return null;
  }
};