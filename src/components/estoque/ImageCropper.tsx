import { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crop as CropIcon, Check, X } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedImage: string) => void;
}

export const ImageCropper = ({ imageSrc, isOpen, onClose, onCropComplete }: ImageCropperProps) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const aspectRatio = 4 / 3; // Aspecto 4:3 para ficar bem no preview
    
    let cropWidth, cropHeight;
    
    if (width / height > aspectRatio) {
      cropHeight = height * 0.8;
      cropWidth = cropHeight * aspectRatio;
    } else {
      cropWidth = width * 0.8;
      cropHeight = cropWidth / aspectRatio;
    }
    
    const crop: Crop = {
      unit: '%',
      width: (cropWidth / width) * 100,
      height: (cropHeight / height) * 100,
      x: ((width - cropWidth) / 2 / width) * 100,
      y: ((height - cropHeight) / 2 / height) * 100
    };
    
    setCrop(crop);
  }, []);

  const getCroppedImg = useCallback(() => {
    if (!completedCrop || !imgRef.current || !canvasRef.current) {
      return;
    }

    const image = imgRef.current;
    const canvas = canvasRef.current;
    const crop = completedCrop;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = crop.width;
    canvas.height = crop.height;

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    canvas.toBlob((blob) => {
      if (blob) {
        const reader = new FileReader();
        reader.onload = () => {
          onCropComplete(reader.result as string);
          onClose();
        };
        reader.readAsDataURL(blob);
      }
    }, 'image/jpeg', 0.95);
  }, [completedCrop, onCropComplete, onClose]);

  const handleCancel = () => {
    setCrop(undefined);
    setCompletedCrop(undefined);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <CropIcon className="w-5 h-5 text-primary" />
            Cortar Imagem
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 px-6 pb-4 min-h-0">
          <div className="h-full max-h-[50vh] flex items-center justify-center">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={4/3}
              minWidth={80}
              minHeight={60}
              className="max-w-full max-h-full"
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                onLoad={onImageLoad}
                className="max-h-[50vh] max-w-full object-contain"
              />
            </ReactCrop>
          </div>
        </div>
        
        <div className="flex justify-center gap-4 p-6 pt-4 border-t bg-background">
          <Button
            onClick={getCroppedImg}
            disabled={!completedCrop}
            className="flex items-center gap-2 px-6"
          >
            <Check className="w-4 h-4" />
            Aplicar Corte
          </Button>
          <Button
            variant="outline"
            onClick={handleCancel}
            className="flex items-center gap-2 px-6"
          >
            <X className="w-4 h-4" />
            Cancelar
          </Button>
        </div>
        
        <canvas
          ref={canvasRef}
          className="hidden"
        />
      </DialogContent>
    </Dialog>
  );
};