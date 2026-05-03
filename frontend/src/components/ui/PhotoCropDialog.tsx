import React, { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ZoomIn, RotateCw, Move } from 'lucide-react';

interface PhotoCropDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageFile: File | null;
  onCropComplete: (croppedFile: File) => void;
}

export default function PhotoCropDialog({
  isOpen,
  onClose,
  imageFile,
  onCropComplete,
}: PhotoCropDialogProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!imageFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string);
      setZoom(1);
      setRotation(0);
      setOffsetX(0);
      setOffsetY(0);
    };
    reader.readAsDataURL(imageFile);
  }, [imageFile]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    setOffsetX((prev) => prev + deltaX);
    setOffsetY((prev) => prev + deltaY);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCrop = useCallback(async () => {
    if (!imageRef.current || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = containerRef.current;
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Create a render canvas the SAME size as the preview container
      const renderCanvas = document.createElement('canvas');
      const renderCtx = renderCanvas.getContext('2d');
      if (!renderCtx) return;

      renderCanvas.width = containerWidth;
      renderCanvas.height = containerHeight;

      renderCtx.save();

      // Apply transforms with origin at center of container (same as preview)
      renderCtx.translate(containerWidth / 2, containerHeight / 2);

      // Apply in correct order: translate, scale, rotate
      renderCtx.rotate((rotation * Math.PI) / 180);
      renderCtx.scale(zoom, zoom);
      renderCtx.translate(offsetX / zoom, offsetY / zoom);

      // Draw image centered
      renderCtx.drawImage(img, -img.width / 2, -img.height / 2);

      renderCtx.restore();

      // Extract center 256x256 square (the yellow guide area)
      const cropSize = 256;
      const startX = (containerWidth - cropSize) / 2;
      const startY = (containerHeight - cropSize) / 2;

      canvas.width = cropSize;
      canvas.height = cropSize;

      ctx.drawImage(
        renderCanvas,
        startX, startY, cropSize, cropSize,
        0, 0, cropSize, cropSize
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

    img.src = imageSrc!;
  }, [imageFile, rotation, offsetX, offsetY, zoom, imageSrc, onCropComplete]);

  const handleClose = () => {
    setImageSrc(null);
    setZoom(1);
    setRotation(0);
    setOffsetX(0);
    setOffsetY(0);
    setIsDragging(false);
    onClose();
  };

  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      // Apply zoom, offset, and rotation
      imageRef.current.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoom}) rotate(${rotation}deg)`;
    }
  }, [zoom, rotation, offsetX, offsetY]);

  // Update transform whenever values change
  React.useEffect(() => {
    if (imageRef.current) {
      imageRef.current.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoom}) rotate(${rotation}deg)`;
    }
  }, [zoom, rotation, offsetX, offsetY]);

  if (!isOpen || !imageSrc) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Crop Your Photo</DialogTitle>
          <p className="text-xs text-gray-500 mt-2">Click and drag to move the image</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview Area */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`relative w-full h-80 bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center border-2 border-dashed border-gray-400 cursor-move transition-colors ${
              isDragging ? 'border-blue-400 bg-gray-800' : ''
            }`}
          >
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop preview"
              onLoad={handleImageLoad}
              className="max-w-full max-h-full object-contain transition-transform select-none"
              draggable="false"
              style={{ 
                transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center',
              }}
            />

            {/* Crop guide - square overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-yellow-400 rounded-lg shadow-lg"></div>
              <div className="absolute inset-0 bg-black/40"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-lg pointer-events-none"></div>
              
              {/* Drag hint when not dragging */}
              {!isDragging && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-white/50 pointer-events-none">
                    <Move className="w-4 h-4" />
                    <span className="text-xs">Drag to move</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Zoom Slider */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ZoomIn className="w-4 h-4 text-gray-600" />
                <Label className="text-sm font-medium">Zoom</Label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xs text-gray-600 w-12 text-right">{(zoom * 100).toFixed(0)}%</span>
              </div>
            </div>

            {/* Rotation Slider */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-gray-600" />
                <Label className="text-sm font-medium">Rotation</Label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="5"
                  value={rotation}
                  onChange={(e) => setRotation(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xs text-gray-600 w-12 text-right">{rotation}°</span>
              </div>
            </div>

            {/* Reset Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setZoom(1);
                setRotation(0);
                setOffsetX(0);
                setOffsetY(0);
              }}
              className="w-full"
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Hidden canvas for cropping */}
        <canvas ref={canvasRef} className="hidden" />

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
