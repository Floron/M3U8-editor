import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Download } from 'lucide-react';

interface ControlPanelProps {
  onAddGroup: (name: string) => void;
  selectedCount: number;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
}

export const ControlPanel = ({ onAddGroup, selectedCount, onDeleteSelected, onClearSelection }: ControlPanelProps) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      onAddGroup(newGroupName.trim());
      setNewGroupName('');
      setIsDialogOpen(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddGroup();
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 bg-card rounded-lg border">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Добавить группу
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать новую группу</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Название группы..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyPress={handleKeyPress}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleAddGroup} disabled={!newGroupName.trim()}>
                Создать
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedCount > 0 && (
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            onClick={onDeleteSelected}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Удалить выбранные ({selectedCount})
          </Button>
          <Button
            variant="outline"
            onClick={onClearSelection}
          >
            Отменить выделение
          </Button>
        </div>
      )}

      <div className="flex-1" />

      <div className="text-sm text-muted-foreground">
        {selectedCount > 0 && `Выбрано: ${selectedCount}`}
      </div>
    </div>
  );
};