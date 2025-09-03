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
    
    // Crop fixo que ocupa toda a imagem
    const crop: Crop = {
      unit: '%',
      width: 100,
      height: 100,
      x: 0,
      y: 0
    };
    
    setCrop(crop);
    setCompletedCrop({
      unit: 'px',
      x: 0,
      y: 0,
      width: width,
      height: height
    });
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
      <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <CropIcon className="w-5 h-5 text-primary" />
            Ajustar Imagem
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex items-center justify-center p-6 bg-muted/20 overflow-hidden">
          <div className="w-full h-full flex items-center justify-center" style={{ maxHeight: '50vh', maxWidth: '80vw' }}>
            <ReactCrop
              crop={crop}
              onChange={() => {}} // Função vazia para manter o crop fixo
              onComplete={(c) => setCompletedCrop(c)}
              disabled={true}
              className="w-full h-full"
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Ajustar imagem"
                onLoad={onImageLoad}
                className="w-full h-full object-contain"
                style={{ 
                  display: 'block',
                  maxHeight: '50vh',
                  maxWidth: '70vw'
                }}
              />
            </ReactCrop>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 p-6 border-t bg-background">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="px-6"
          >
            Cancelar
          </Button>
          <Button
            onClick={getCroppedImg}
            disabled={!completedCrop}
            className="px-6 bg-primary hover:bg-primary/90"
          >
            <Check className="w-4 h-4 mr-2" />
            Confirmar
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