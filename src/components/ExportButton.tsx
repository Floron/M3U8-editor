import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { PlaylistData } from '@/types/playlist';
import { M3U8Parser } from '@/utils/m3u8Parser';

interface ExportButtonProps {
  data: PlaylistData;
  filename?: string;
}

export const ExportButton = ({ data, filename = 'playlist.m3u8' }: ExportButtonProps) => {
  const handleExport = () => {
    const content = M3U8Parser.generate(data);
    const blob = new Blob([content], { type: 'application/x-mpegURL' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Button onClick={handleExport} className="btn-accent">
      <Download className="w-4 h-4 mr-2" />
      Скачать M3U8
    </Button>
  );
};