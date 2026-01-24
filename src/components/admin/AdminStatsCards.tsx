import { Card } from '@/components/ui/card';
import { Users, UserX, Clock, AlertTriangle, Trash2 } from 'lucide-react';
import { ExamSession } from './types';

interface AdminStatsCardsProps {
  ongoingSessions: ExamSession[];
  disqualifiedSessions: ExamSession[];
  deletedSessions: ExamSession[];
}

export const AdminStatsCards = ({ 
  ongoingSessions, 
  disqualifiedSessions, 
  deletedSessions 
}: AdminStatsCardsProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-blue-100">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-blue-600/70">Sedang Ujian</p>
            <p className="text-2xl font-bold text-blue-700">{ongoingSessions.length}</p>
          </div>
        </div>
      </Card>
      
      <Card className="p-4 bg-red-50 border-red-200">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-red-100">
            <UserX className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-red-600/70">Diskualifikasi</p>
            <p className="text-2xl font-bold text-red-700">
              {disqualifiedSessions.filter(s => s.status === 'aborted').length}
            </p>
          </div>
        </div>
      </Card>
      
      <Card className="p-4 bg-orange-50 border-orange-200">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-orange-100">
            <Clock className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-sm text-orange-600/70">Ditinggalkan</p>
            <p className="text-2xl font-bold text-orange-700">
              {disqualifiedSessions.filter(s => s.status === 'abandoned').length}
            </p>
          </div>
        </div>
      </Card>
      
      <Card className="p-4 bg-slate-50 border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-slate-100">
            <AlertTriangle className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-sm text-slate-600/70">Total Issue</p>
            <p className="text-2xl font-bold text-slate-700">{disqualifiedSessions.length}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-amber-50 border-amber-200">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-amber-100">
            <Trash2 className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-amber-600/70">Di Sampah</p>
            <p className="text-2xl font-bold text-amber-700">{deletedSessions.length}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
