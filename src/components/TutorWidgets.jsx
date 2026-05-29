import React, { useEffect, useState } from 'react';
import { Star, Activity, AlertTriangle } from 'lucide-react';
import { getDailyReport, getDailyProgress } from '../api/tutor';

export default function TutorWidgets({ session }) {
  const userId = session?.user?.id;
  const [report, setReport] = useState(null);
  const [progress, setProgress] = useState({ percent: 0, submissions: 0, assignments: 0 });

  const load = async () => {
    if (!userId) return;
    try {
      const r = await getDailyReport({ userId });
      setReport(r);
      const p = await getDailyProgress({ userId });
      setProgress(p);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); const iv = setInterval(load, 7000); return () => clearInterval(iv); }, [userId]);

  const grade = report?.current_grade ? Math.round(report.current_grade) : null;
  let mood = 'Neutral';
  if (grade >= 4) mood = 'Qoniqqan';
  else if (grade >= 2) mood = 'Talabchan';
  else if (grade !== null) mood = 'Qattiqqo\'l';

  return (
    <div className="space-y-4">
      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-slate-400">Kunlik Baho</div>
          <div className="text-xs text-slate-400">{new Date().toLocaleDateString()}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold text-indigo-600">{grade ?? '-'}</div>
          <div className="flex-1">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500" style={{ width: `${(grade || 0) * 20}%` }} />
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Joriy reyting (1-5)</div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-slate-400">Kunlik Maqsad</div>
          <div className="text-xs text-slate-400">{progress.percent}%</div>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-emerald-500" style={{ width: `${progress.percent}%` }} />
        </div>
        <div className="text-[11px] text-slate-400">Topshiriqlar: {progress.submissions}/{progress.assignments}</div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <AlertTriangle size={18} className="text-indigo-500" />
          <div>
            <div className="text-sm font-semibold">O'qituvchi Kayfiyati</div>
            <div className="text-[12px] text-slate-500">{mood}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
