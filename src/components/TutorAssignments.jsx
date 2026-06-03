import { useEffect, useState } from 'react';
import { Calendar, Clock, Star, RefreshCw } from 'lucide-react';
import { getAssignments, getStudyTime, getDailyRating } from '../api/tutor';

export default function TutorAssignments({ session, onClose }) {
  const userId = session?.user?.id;
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [rating, setRating] = useState(null);

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const list = await getAssignments();
      setAssignments(list || []);
      const t = await getStudyTime({ userId });
      setTodayMinutes(t.minutes || 0);
      const r = await getDailyRating({ userId });
      setRating(r.rating ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [userId]);

  return (
    <div className="w-full flex flex-col text-slate-700 font-sans select-none animate-in fade-in duration-200">
      
      {/* Mini Controller / Refresh */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200/40">
        <span className="text-[10px] tracking-wider text-slate-400 uppercase font-medium">Jonli tahlillar</span>
        <button onClick={load} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Stats Section - No background boxes, just light clean rows */}
      <div className="space-y-5 mb-6">
        
        {/* Kunlik Baho Row */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/40">
          <div className="space-y-0.5">
            <span className="text-xs text-slate-400/90 font-light">Kunlik baho</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  size={13} 
                  className={rating >= star ? "text-amber-400 fill-amber-400" : "text-slate-200"} 
                />
              ))}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl text-slate-800 font-light">{rating ?? '—'}</span>
            <p className="text-[9px] text-slate-400 font-light tracking-wide">Joriy reyting</p>
          </div>
        </div>

        {/* Bugungi dars vaqti Row */}
        <div className="space-y-2 pb-3 border-b border-slate-200/40">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400/90 font-light">Bugungi dars vaqti</span>
            <span className="text-slate-800 font-medium">{todayMinutes} daqiqa</span>
          </div>
          <div className="w-full bg-slate-200/50 h-1 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full rounded-full transition-all duration-300" 
              style={{ width: `${Math.min((todayMinutes / 60) * 100, 100)}%` }}
            ></div>
          </div>
        </div>

      </div>

      {/* Topshiriqlar Ro'yxati */}
      <div className="flex flex-col min-h-0">
        <span className="text-[10px] tracking-wider text-slate-400 uppercase font-medium mb-3">AI Topshiriqlari</span>
        
        <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
          {loading && assignments.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-400 font-light animate-pulse">Yuklanmoqda...</div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-400 font-light italic">
              Hozircha topshiriqlar berilmadi
            </div>
          ) : (
            assignments.map(a => (
              <div key={a.id} className="pb-3 border-b border-slate-200/30 last:border-0">
                <h4 className="text-sm text-slate-800 font-normal mb-1 tracking-tight">{a.title}</h4>
                <p className="text-xs text-slate-500 font-light line-clamp-2 mb-2 leading-relaxed">{a.description}</p>
                
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-light">
                  <span className="flex items-center gap-1 text-slate-400/80">
                    <Calendar size={11} />
                    Muddati: {a.due_date ? new Date(a.due_date).toLocaleDateString() : '—'}
                  </span>
                  <span className="text-indigo-600 font-medium bg-indigo-50/60 px-1.5 py-0.5 rounded text-[9px]">
                    Maks: {a.max_score} ball
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}