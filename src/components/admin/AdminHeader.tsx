import { Button } from '@/components/ui/button';
import { Shield, LogOut, RefreshCw, Loader2 } from 'lucide-react';

interface AdminHeaderProps {
  onRefresh: () => void;
  onLogout: () => void;
  isFetching: boolean;
}

export const AdminHeader = ({ onRefresh, onLogout, isFetching }: AdminHeaderProps) => {
  return (
    <header className="bg-slate-900 text-white py-4 shadow-lg">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6" />
          <div>
            <h1 className="text-lg font-bold">Admin Panel</h1>
            <p className="text-xs text-white/70">Monitoring Sesi Ujian</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isFetching}
            className="text-white border-white/30 hover:bg-white/10"
          >
            {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="hidden sm:inline ml-2">Refresh</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-white hover:bg-white/10"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Keluar</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
