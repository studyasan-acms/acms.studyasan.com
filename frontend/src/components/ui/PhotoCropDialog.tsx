import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface PhotoCropDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageFile: File | null;
  onCropComplete: (croppedFile: File) => void;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

export default function PhotoCropDialog({
  isOpen,
  onClose,
  imageFile,
  onCropComplete,
}: PhotoCropDialogProps) {
  const [imgSrc, setImgSrc] = useState('');
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImgSrc(e.target?.result as string);
      };
      reader.readAsDataURL(imageFile);
    } else {
      setImgSrc('');
    }
  }, [imageFile]);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  }

  const handleCrop = async () => {
    if (!completedCrop || !imgRef.current) {
        return;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    // Create a 256x256 image for consistency
    const cropSize = 256;
    canvas.width = cropSize;
    canvas.height = cropSize;

    // Draw the cropped portion to the canvas
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      cropSize,
      cropSize
    );

    canvas.toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], imageFile?.name || 'cropped.jpg', {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        onCropComplete(croppedFile);
        handleClose();
      }
    }, 'image/jpeg', 0.95);
  };

  const handleClose = () => {
    setImgSrc('');
    setCrop(undefined);
    setCompletedCrop(undefined);
    onClose();
  };

  if (!isOpen || !imgSrc) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Crop Your Photo</DialogTitle>
          <p className="text-xs text-gray-500 mt-2">
            Drag to move the square • Drag edges to resize
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-center max-h-[60vh] overflow-hidden bg-gray-900 rounded-lg">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={1}
              circularCrop={false}
              className="max-h-[60vh]"
            >
              <img
                ref={imgRef}
                alt="Crop preview"
                src={imgSrc}
                onLoad={onImageLoad}
                className="max-h-[60vh] object-contain"
              />
            </ReactCrop>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleCrop} className="bg-blue-600 hover:bg-blue-700 text-white">
            Crop & Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
