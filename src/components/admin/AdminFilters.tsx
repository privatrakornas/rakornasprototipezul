import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, Search, X } from 'lucide-react';
import { FilterState } from './types';

interface AdminFiltersProps {
  filters: FilterState;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onClearFilters: () => void;
  filteredCounts: {
    ongoing: number;
    disqualified: number;
    deleted: number;
  };
}

export const AdminFilters = ({
  filters,
  onSearchChange,
  onStatusChange,
  onDateFromChange,
  onDateToChange,
  onClearFilters,
  filteredCounts,
}: AdminFiltersProps) => {
  const hasActiveFilters = 
    filters.searchQuery !== '' || 
    filters.statusFilter !== 'all' || 
    filters.dateFrom !== '' || 
    filters.dateTo !== '';

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Filter & Pencarian</h3>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="ml-auto text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4 mr-1" />
              Reset Filter
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search by Name */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama peserta..."
              value={filters.searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Filter by Status */}
          <Select value={filters.statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="ongoing">Sedang Ujian</SelectItem>
              <SelectItem value="finished">Selesai</SelectItem>
              <SelectItem value="aborted">Diskualifikasi</SelectItem>
              <SelectItem value="abandoned">Ditinggalkan</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Date From */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Dari:</span>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="flex-1"
            />
          </div>
          
          {/* Date To */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Sampai:</span>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>
        
        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Hasil:</span>
            <Badge variant="secondary">{filteredCounts.ongoing} Sedang Ujian</Badge>
            <Badge variant="secondary">{filteredCounts.disqualified} Diskualifikasi</Badge>
            <Badge variant="secondary">{filteredCounts.deleted} Di Sampah</Badge>
          </div>
        )}
      </div>
    </Card>
  );
};
