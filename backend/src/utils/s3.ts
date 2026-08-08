import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

const BUCKET_NAME = process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME!;

const getBucketRegion = (bucketName: string): string => {
  if (bucketName === 'teacher-profiles') return 'ap-southeast-1';
  return process.env.AWS_REGION || 'us-east-1';
};

const getS3Client = (bucketName: string): S3Client => {
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
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
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
  if (['.mp3', '.wav', '.ogg', '.m4a'].includes(ext)) return 'audio';
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
    const client = getS3Client(BUCKET_NAME);
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await client.send(command);
  } catch (error) {
    console.error('S3 Delete Error:', error);
    throw new Error('Failed to delete file from S3');
  }
};

// Delete multiple files from S3
export const deleteMultipleFromS3 = async (keys: string[]): Promise<void> => {
  try {
    const deletePromises = keys.map((key) => deleteFromS3(key));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('S3 Multiple Delete Error:', error);
    throw new Error('Failed to delete files from S3');
  }
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

// Extract S3 key from URL
export const extractS3KeyFromUrl = (url: string): string | null => {
  try {
    const urlPattern = new RegExp(`https://${BUCKET_NAME}\\.s3\\.[a-z0-9-]+\\.amazonaws\\.com/(.+)`);
    const match = url.match(urlPattern);
    return match && match[1] ? match[1] : null;
  } catch (error) {
    return null;
  }
};