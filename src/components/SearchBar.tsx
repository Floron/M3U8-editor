import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSelectAll: () => void;
  hasResults: boolean;
}

export const SearchBar = ({ searchTerm, onSearchChange, onSelectAll, hasResults }: SearchBarProps) => {
  const clearSearch = () => {
    onSearchChange('');
  };

  return (
    <div className="flex gap-2 mb-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Поиск каналов..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
      {searchTerm && hasResults && (
        <Button 
          onClick={onSelectAll}
          variant="outline"
        >
          Выбрать все найденные
        </Button>
      )}
    </div>
  );
};