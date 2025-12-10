import type { Crop } from 'react-image-crop';

/**
 * Redimensiona uma imagem mantendo a proporção e adiciona padding para criar uma imagem quadrada
 * @param imageSrc - URL da imagem (data URL ou URL normal)
 * @param targetSize - Tamanho alvo (largura e altura serão iguais)
 * @param quality - Qualidade do JPEG (0-1)
 * @returns Promise com a imagem redimensionada como data URL
 */
export const resizeImageToSquare = (
  imageSrc: string,
  targetSize: number = 512,
  quality: number = 0.9
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Não foi possível obter o contexto do canvas'));
        return;
      }

      // Define o canvas como quadrado
      canvas.width = targetSize;
      canvas.height = targetSize;

      // Preenche com fundo branco
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetSize, targetSize);

      // Calcula o redimensionamento mantendo a proporção
      const scale = Math.min(targetSize / img.width, targetSize / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;

      // Centraliza a imagem
      const x = (targetSize - scaledWidth) / 2;
      const y = (targetSize - scaledHeight) / 2;

      // Desenha a imagem redimensionada e centralizada
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

      // Converte para JPEG com qualidade especificada
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          } else {
            reject(new Error('Falha ao converter canvas para blob'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Falha ao carregar a imagem'));
    img.src = imageSrc;
  });
};

/**
 * Corta uma imagem baseado nas coordenadas do crop e redimensiona para o tamanho alvo
 * @param image - Elemento de imagem HTML
 * @param crop - Coordenadas do crop (do react-image-crop)
 * @param targetSize - Tamanho alvo do quadrado (padrão: 960)
 * @param quality - Qualidade do JPEG (0-1)
 * @returns Promise com a imagem cortada como data URL
 */
export const cropImageToSquare = (
  image: HTMLImageElement,
  crop: Crop,
  targetSize: number = 960,
  quality: number = 0.9
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Não foi possível obter o contexto do canvas'));
      return;
    }

    // Calcular as coordenadas reais do crop na imagem
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Converter percentuais para pixels se necessário
    let cropX: number, cropY: number, cropWidth: number, cropHeight: number;

    if (crop.unit === '%') {
      cropX = (crop.x / 100) * image.naturalWidth;
      cropY = (crop.y / 100) * image.naturalHeight;
      cropWidth = (crop.width / 100) * image.naturalWidth;
      cropHeight = (crop.height / 100) * image.naturalHeight;
    } else {
      cropX = crop.x * scaleX;
      cropY = crop.y * scaleY;
      cropWidth = crop.width * scaleX;
      cropHeight = crop.height * scaleY;
    }

    // Define o canvas com o tamanho alvo
    canvas.width = targetSize;
    canvas.height = targetSize;

    // Preenche com fundo branco
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetSize, targetSize);

    // Desenha a área cortada redimensionada para o tamanho alvo
    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      targetSize,
      targetSize
    );

    // Converte para JPEG com qualidade especificada
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        } else {
          reject(new Error('Falha ao converter canvas para blob'));
        }
      },
      'image/jpeg',
      quality
    );
  });
};
