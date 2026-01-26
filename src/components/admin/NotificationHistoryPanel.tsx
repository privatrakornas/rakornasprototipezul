import { useState, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Bell, 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  UserPlus, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Trash2,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export interface NotificationItem {
  id: string;
  type: 'start' | 'finish' | 'disqualify';
  name: string;
  message: string;
  description?: string;
  isLulus?: boolean;
  timestamp: Date;
}

interface NotificationHistoryPanelProps {
  notifications: NotificationItem[];
  onClearAll?: () => void;
}

type NotificationType = 'all' | 'start' | 'finish' | 'disqualify';

const getNotificationIcon = (type: NotificationItem['type'], isLulus?: boolean) => {
  switch (type) {
    case 'start':
      return <UserPlus className="w-4 h-4 text-blue-500" />;
    case 'finish':
      return isLulus 
        ? <CheckCircle className="w-4 h-4 text-green-500" />
        : <XCircle className="w-4 h-4 text-red-500" />;
    case 'disqualify':
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    default:
      return <Bell className="w-4 h-4" />;
  }
};

const getNotificationBadge = (type: NotificationItem['type'], isLulus?: boolean) => {
  switch (type) {
    case 'start':
      return <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700">Mulai Ujian</Badge>;
    case 'finish':
      return isLulus 
        ? <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700">Selesai - Lulus</Badge>
        : <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-700">Selesai - TL</Badge>;
    case 'disqualify':
      return <Badge variant="destructive" className="text-[10px]">Diskualifikasi</Badge>;
    default:
      return null;
  }
};

export const NotificationHistoryPanel = ({ 
  notifications, 
  onClearAll 
}: NotificationHistoryPanelProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<NotificationType>('all');

  const filteredNotifications = useMemo(() => {
    return notifications.filter(notif => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!notif.name.toLowerCase().includes(query) && 
            !notif.message.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      // Type filter
      if (typeFilter !== 'all' && notif.type !== typeFilter) {
        return false;
      }
      
      return true;
    });
  }, [notifications, searchQuery, typeFilter]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setTypeFilter('all');
  }, []);

  const hasActiveFilters = searchQuery || typeFilter !== 'all';

  const getTypeFilterLabel = () => {
    switch (typeFilter) {
      case 'start': return 'Mulai';
      case 'finish': return 'Selesai';
      case 'disqualify': return 'Diskualifikasi';
      default: return 'Semua';
    }
  };

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Riwayat Notifikasi</h3>
          <Badge variant="outline" className="text-[10px]">
            {filteredNotifications.length}{hasActiveFilters ? `/${notifications.length}` : ''}
          </Badge>
        </div>
        {notifications.length > 0 && onClearAll && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive"
            onClick={onClearAll}
          >
            <Trash2 className="w-3 h-3" />
            Hapus Semua
          </Button>
        )}
      </div>
      
      {/* Search and Filter */}
      <div className="px-2 py-2 border-b flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari nama/pesan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 pl-7 text-xs"
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              <Filter className="w-3 h-3" />
              {getTypeFilterLabel()}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuCheckboxItem
              checked={typeFilter === 'all'}
              onCheckedChange={() => setTypeFilter('all')}
            >
              Semua Tipe
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={typeFilter === 'start'}
              onCheckedChange={() => setTypeFilter('start')}
            >
              <UserPlus className="w-3 h-3 mr-1.5 text-blue-500" />
              Mulai Ujian
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={typeFilter === 'finish'}
              onCheckedChange={() => setTypeFilter('finish')}
            >
              <CheckCircle className="w-3 h-3 mr-1.5 text-green-500" />
              Selesai Ujian
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={typeFilter === 'disqualify'}
              onCheckedChange={() => setTypeFilter('disqualify')}
            >
              <AlertTriangle className="w-3 h-3 mr-1.5 text-amber-500" />
              Diskualifikasi
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2"
            onClick={clearFilters}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
      
      {/* Notification List */}
      <ScrollArea className="flex-1">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
            <Bell className="w-8 h-8 opacity-30" />
            <p>{hasActiveFilters ? 'Tidak ada hasil sesuai filter' : 'Belum ada notifikasi'}</p>
            {hasActiveFilters && (
              <Button variant="link" size="sm" onClick={clearFilters} className="text-xs">
                Reset Filter
              </Button>
            )}
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {filteredNotifications.map((notif) => (
              <div 
                key={notif.id}
                className="flex items-start gap-3 p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="mt-0.5">
                  {getNotificationIcon(notif.type, notif.isLulus)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm truncate">{notif.name}</span>
                    {getNotificationBadge(notif.type, notif.isLulus)}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notif.message}
                  </p>
                  {notif.description && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {notif.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap">
                  <Clock className="w-3 h-3" />
                  {format(notif.timestamp, 'HH:mm', { locale: localeId })}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};

export default NotificationHistoryPanel;
