import { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { PlaylistEditor } from '@/components/PlaylistEditor';
import { ExportButton } from '@/components/ExportButton';
import { PlaylistData } from '@/types/playlist';
import { Waves } from 'lucide-react';

const Index = () => {
  const [playlistData, setPlaylistData] = useState<PlaylistData | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-gradient-to-r from-primary to-primary-glow">
              <Waves className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              M3U8 Редактор Плейлистов
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Профессиональный инструмент для редактирования M3U8 плейлистов с поддержкой кириллицы, 
            перетаскивания каналов и управления группами
          </p>
        </header>

        <div className="space-y-6">
          {!playlistData ? (
            <div className="text-center py-12">
              <FileUpload onPlaylistLoad={setPlaylistData} />
              <p className="text-sm text-muted-foreground mt-4">
                Загрузите M3U8 файл для начала редактирования
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">
                  Плейлист загружен • {playlistData.groups.reduce((acc, group) => acc + group.channels.length, 0)} каналов
                </h2>
                <div className="flex gap-3">
                  <FileUpload onPlaylistLoad={setPlaylistData} />
                  <ExportButton data={playlistData} />
                </div>
              </div>
              
              <PlaylistEditor 
                data={playlistData} 
                onDataChange={setPlaylistData} 
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
