import type { Request, Response } from 'express';
import axios from 'axios';
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

/**
 * File proxy endpoint to prevent CORS restrictions when loading S3 assets in client canvas/PDF workers.
 */
export const proxyFile = async (req: Request, res: Response): Promise<void> => {
    try {
        const fileUrl = req.query.url as string;
        if (!fileUrl) {
            res.status(400).json({ success: false, message: 'URL query parameter is required' });
            return;
        }

        const response = await axios.get(fileUrl, {
            responseType: 'arraybuffer',
            timeout: 20000,
        });

        const contentType = String(response.headers['content-type'] || 'application/pdf');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(Buffer.from(response.data));
    } catch (error: any) {
        console.error('Proxy file error:', error?.message || error);
        res.status(500).json({ success: false, message: 'Failed to proxy file' });
    }
};
