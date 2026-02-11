import type { Request, Response } from 'express';
import { uploadToS3 } from '../utils/s3.js';

/**
 * Generic file upload endpoint.
 * Uploads a single file to S3 under the specified folder and returns the public URL.
 */
export const uploadFile = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, message: 'No file provided' });
            return;
        }

        // Allow caller to specify a folder via query param, default to 'uploads'
        const folder = (req.query.folder as string) || 'uploads';

        const result = await uploadToS3(req.file, folder);

        res.status(200).json({
            success: true,
            data: {
                url: result.url,
                key: result.key,
                filename: result.filename,
            },
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload file' });
    }
};
