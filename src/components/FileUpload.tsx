import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { M3U8Parser } from '@/utils/m3u8Parser';
import { PlaylistData } from '@/types/playlist';

interface FileUploadProps {
  onPlaylistLoad: (data: PlaylistData) => void;
}

export const FileUpload = ({ onPlaylistLoad }: FileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        const data = M3U8Parser.parse(content);
        onPlaylistLoad(data);
      } catch (error) {
        console.error('Error parsing M3U8 file:', error);
        // You can add toast notification here
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="mb-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".m3u8,.m3u"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button 
        onClick={handleFileSelect}
        className="btn-primary"
      >
        <Upload className="w-4 h-4 mr-2" />
        Загрузить M3U8 файл
      </Button>
    </div>
  );
};