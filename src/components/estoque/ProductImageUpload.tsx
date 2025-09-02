import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, Link2 } from 'lucide-react';

interface ProductImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

// Sample image suggestions for food products
const imageSuggestions = [
  {
    url: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=100&h=100&fit=crop',
    name: 'Farinha'
  },
  {
    url: 'https://images.unsplash.com/photo-1571167530149-c72f2b8b82c5?w=100&h=100&fit=crop',
    name: 'Açúcar'
  },
  {
    url: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=100&h=100&fit=crop',
    name: 'Óleo'
  },
  {
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=100&h=100&fit=crop',
    name: 'Sal'
  },
  {
    url: 'https://images.unsplash.com/photo-1587132137056-bfbf0166836e?w=100&h=100&fit=crop',
    name: 'Leite'
  },
  {
    url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=100&h=100&fit=crop',
    name: 'Ovos'
  }
];

export const ProductImageUpload = ({ value, onChange }: ProductImageUploadProps) => {
  const [urlInput, setUrlInput] = useState('');

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setUrlInput('');
    }
  };

  const handleSuggestionClick = (url: string) => {
    onChange(url);
  };

  return (
    <div className="space-y-4">
      {/* Current Image Preview */}
      {value && (
        <div className="relative">
          <img
            src={value}
            alt="Produto"
            className="w-32 h-32 object-cover rounded-lg border"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://via.placeholder.com/128x128?text=Erro';
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange('')}
            className="absolute -top-2 -right-2"
          >
            Remover
          </Button>
        </div>
      )}

      {/* URL Input */}
      <div className="flex gap-2">
        <Input
          placeholder="Cole a URL da imagem aqui..."
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleUrlSubmit}
          disabled={!urlInput.trim()}
        >
          <Link2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Image Suggestions */}
      <div>
        <p className="text-sm text-muted-foreground mb-2">Sugestões de imagem:</p>
        <div className="grid grid-cols-6 gap-2">
          {imageSuggestions.map((suggestion, index) => (
            <Card
              key={index}
              className="p-1 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleSuggestionClick(suggestion.url)}
            >
              <img
                src={suggestion.url}
                alt={suggestion.name}
                className="w-full h-16 object-cover rounded"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://via.placeholder.com/64x64?text=Erro';
                }}
              />
              <p className="text-xs text-center mt-1 truncate">{suggestion.name}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};