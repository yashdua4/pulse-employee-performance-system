import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { 
  Award, 
  Plus, 
  Trash2, 
  Star, 
  CheckSquare, 
  X, 
  Send,
  Eye,
  PlusCircle,
  MinusCircle
} from 'lucide-react';

export const Performance: React.FC = () => {
  const { user, apiFetch } = useAuthStore();
  const [reviews, setReviews] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [activeReviewDetail, setActiveReviewDetail] = useState<any | null>(null);

  // Form States
  const [revieweeId, setRevieweeId] = useState('');
  const [period, setPeriod] = useState('Q1 2026');
  const [technicalSkills, setTechnicalSkills] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [teamwork, setTeamwork] = useState(5);
  const [problemSolving, setProblemSolving] = useState(5);
  const [leadership, setLeadership] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [goals, setGoals] = useState<string[]>(['']);
  const [submitStatus, setSubmitStatus] = useState<'DRAFT' | 'SUBMITTED'>('DRAFT');

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/reviews');
      setReviews(data);
      if (activeReviewDetail) {
        // Refresh active review details
        const refreshed = data.find((r: any) => r.id === activeReviewDetail.id);
        if (refreshed) setActiveReviewDetail(refreshed);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await apiFetch('/employees');
      setEmployees(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReviews();
    if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
      fetchEmployees();
    }
  }, []);

  const handleGoalAdd = () => {
    setGoals([...goals, '']);
  };

  const handleGoalRemove = (index: number) => {
    const fresh = [...goals];
    fresh.splice(index, 1);
    setGoals(fresh);
  };

  const handleGoalChange = (index: number, val: string) => {
    const fresh = [...goals];
    fresh[index] = val;
    setGoals(fresh);
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revieweeId || !feedback) return;

    // Filter out blank goals
    const filteredGoals = goals.filter(g => g.trim() !== '');

    try {
      await apiFetch('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          revieweeId,
          period,
          technicalSkills,
          communication,
          teamwork,
          problemSolving,
          leadership,
          feedback,
          goals: JSON.stringify(filteredGoals),
          status: submitStatus,
        }),
      });

      setShowReviewModal(false);
      // Reset form
      setRevieweeId('');
      setPeriod('Q1 2026');
      setTechnicalSkills(5);
      setCommunication(5);
      setTeamwork(5);
      setProblemSolving(5);
      setLeadership(5);
      setFeedback('');
      setGoals(['']);
      setSubmitStatus('DRAFT');
      
      fetchReviews();
    } catch (err: any) {
      alert(err.message || 'Error creating performance review');
    }
  };

  const handleAcknowledge = async (reviewId: string) => {
    try {
      await apiFetch(`/reviews/${reviewId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'ACKNOWLEDGED' }),
      });
      fetchReviews();
    } catch (err: any) {
      alert(err.message || 'Error acknowledging review');
    }
  };

  const handleDeleteReview = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this review?')) return;

    try {
      await apiFetch(`/reviews/${id}`, { method: 'DELETE' });
      if (activeReviewDetail?.id === id) {
        setActiveReviewDetail(null);
      }
      fetchReviews();
    } catch (err: any) {
      alert(err.message || 'Error deleting review');
    }
  };

  if (loading && reviews.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900 min-h-screen text-slate-400">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-slate-900 min-h-screen overflow-y-auto">
      
      {/* Header */}
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-100 tracking-tight">Performance Evaluations</h1>
          <p className="text-slate-400 mt-1">Submit feedback, structure goals, and acknowledge quarterly evaluations.</p>
        </div>

        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
          <button
            onClick={() => setShowReviewModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl font-semibold text-sm transition-all shadow-lg shadow-violet-500/10 cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Create Review</span>
          </button>
        )}
      </header>

      {/* Review Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reviews.map((rev) => (
          <div
            key={rev.id}
            onClick={() => setActiveReviewDetail(rev)}
            className="p-6 rounded-3xl bg-slate-800/30 hover:bg-slate-800/40 border border-slate-850 hover:border-violet-500/50 cursor-pointer transition-all flex flex-col justify-between space-y-4 group"
          >
            <div>
              <div className="flex justify-between items-start gap-4">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-violet-950 text-violet-400 border border-violet-850">
                  {rev.period}
                </span>
                
                <div className="flex gap-1.5 items-center">
                  {/* Delete option for Author/Admin */}
                  {(user?.role === 'ADMIN' || rev.reviewerId === user?.id) && (
                    <button
                      onClick={(e) => handleDeleteReview(rev.id, e)}
                      className="p-1 hover:bg-rose-950/30 rounded text-slate-500 hover:text-rose-400 transition-all cursor-pointer"
                      title="Delete Review"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Names */}
              <div className="mt-4">
                {user?.role === 'EMPLOYEE' ? (
                  <span className="text-xs text-slate-500 block">Evaluated by:</span>
                ) : (
                  <span className="text-xs text-slate-500 block">Employee:</span>
                )}
                <span className="font-bold text-slate-100 text-base mt-0.5 block">
                  {user?.role === 'EMPLOYEE' ? rev.reviewer.name : rev.reviewee.name}
                </span>
                <span className="text-xs text-slate-400 block mt-0.5">
                  {user?.role === 'EMPLOYEE' ? rev.reviewer.designation || 'Manager' : rev.reviewee.designation || 'Staff'}
                </span>
              </div>
            </div>

            {/* Score and Status */}
            <div className="space-y-3 pt-2">
              <hr className="border-slate-850" />
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <Star className="h-4.5 w-4.5 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-bold text-slate-200">
                    {rev.overallRating !== undefined && rev.overallRating !== null
                      ? rev.overallRating.toFixed(1)
                      : 'N/A'}{' '}
                    <span className="text-[10px] text-slate-500 font-normal">/ 5.0</span>
                  </span>
                </div>

                <span className={`inline-block text-[9px] px-2 py-0.5 font-bold uppercase rounded border ${
                  rev.status === 'ACKNOWLEDGED'
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-900'
                    : rev.status === 'SUBMITTED'
                      ? 'bg-indigo-950 text-indigo-400 border-indigo-900'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {rev.status}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 text-xs font-semibold text-violet-400 group-hover:translate-x-1 transition-transform">
                <span className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  <span>View Details</span>
                </span>
              </div>
            </div>

          </div>
        ))}

        {reviews.length === 0 && (
          <div className="col-span-full border-2 border-dashed border-slate-800 rounded-3xl py-16 text-center text-slate-500">
            <Award className="h-12 w-12 mx-auto text-slate-600 mb-4" />
            <h3 className="font-bold text-slate-450 mb-1">No Evaluation Records</h3>
            <p className="text-sm">There are no reviews submitted for you in this period.</p>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {activeReviewDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button 
              onClick={() => setActiveReviewDetail(null)} 
              className="absolute right-6 top-6 text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>

            <header className="mb-6 flex justify-between items-start gap-4">
              <div>
                <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded bg-violet-950 text-violet-400 border border-violet-850">
                  {activeReviewDetail.period} Evaluation
                </span>
                <h2 className="text-2xl font-black text-slate-100 mt-3">{activeReviewDetail.reviewee.name}</h2>
                <p className="text-slate-400 text-xs mt-0.5">{activeReviewDetail.reviewee.designation} | {activeReviewDetail.reviewee.department?.name || 'Staff'}</p>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Overall Score</span>
                <div className="flex items-center gap-1.5 mt-1 bg-slate-950 px-3 py-1.5 rounded-2xl border border-slate-850">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-bold text-slate-200">{activeReviewDetail.overallRating.toFixed(1)} / 5.0</span>
                </div>
              </div>
            </header>

            <div className="space-y-6">
              
              {/* Skills Assessment details */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Skills Assessment</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-950/45 border border-slate-850 rounded-2xl">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-400">Technical Skills</span>
                    <div className="flex items-center gap-1 font-mono">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-3.5 w-3.5 ${i < activeReviewDetail.technicalSkills ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} 
                        />
                      ))}
                      <span className="text-xs font-bold text-slate-350 ml-1">{activeReviewDetail.technicalSkills}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-400">Communication</span>
                    <div className="flex items-center gap-1 font-mono">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-3.5 w-3.5 ${i < activeReviewDetail.communication ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} 
                        />
                      ))}
                      <span className="text-xs font-bold text-slate-350 ml-1">{activeReviewDetail.communication}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-400">Teamwork</span>
                    <div className="flex items-center gap-1 font-mono">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-3.5 w-3.5 ${i < activeReviewDetail.teamwork ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} 
                        />
                      ))}
                      <span className="text-xs font-bold text-slate-350 ml-1">{activeReviewDetail.teamwork}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-400">Problem Solving</span>
                    <div className="flex items-center gap-1 font-mono">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-3.5 w-3.5 ${i < activeReviewDetail.problemSolving ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} 
                        />
                      ))}
                      <span className="text-xs font-bold text-slate-350 ml-1">{activeReviewDetail.problemSolving}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center sm:col-span-2">
                    <span className="text-xs font-semibold text-slate-400">Leadership</span>
                    <div className="flex items-center gap-1 font-mono">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-3.5 w-3.5 ${i < activeReviewDetail.leadership ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} 
                        />
                      ))}
                      <span className="text-xs font-bold text-slate-350 ml-1">{activeReviewDetail.leadership}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Written feedback */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Manager's Feedback Remarks</span>
                <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl text-slate-350 text-sm leading-relaxed whitespace-pre-line italic font-serif">
                  "{activeReviewDetail.feedback}"
                </div>
              </div>

              {/* Goals list */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Agreed Performance Goals</span>
                <div className="p-4 bg-slate-950/30 border border-slate-850 rounded-2xl">
                  {activeReviewDetail.goals ? (
                    <ul className="space-y-2">
                      {JSON.parse(activeReviewDetail.goals).map((goal: string, idx: number) => (
                        <li key={idx} className="flex gap-3 text-sm text-slate-300">
                          <span className="text-violet-400 font-bold">{idx + 1}.</span>
                          <span>{goal}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No custom goals specified.</p>
                  )}
                </div>
              </div>

              {/* Review metadata / acknowledgement */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-850 text-xs text-slate-400">
                <div>
                  <span>Evaluated by: </span>
                  <span className="font-semibold text-slate-300">{activeReviewDetail.reviewer.name}</span>
                </div>

                {/* Employee Acknowledge Action button */}
                {user?.role === 'EMPLOYEE' && activeReviewDetail.status === 'SUBMITTED' && (
                  <button
                    onClick={() => handleAcknowledge(activeReviewDetail.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-semibold transition-all cursor-pointer shadow-lg shadow-violet-500/10"
                  >
                    <CheckSquare className="h-4 w-4" />
                    <span>Acknowledge Review</span>
                  </button>
                )}

                {activeReviewDetail.status === 'ACKNOWLEDGED' && (
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckSquare className="h-4 w-4" />
                    <span>Acknowledged</span>
                  </span>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* CREATE REVIEW MODAL */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button onClick={() => setShowReviewModal(false)} className="absolute right-6 top-6 text-slate-500 hover:text-slate-300 cursor-pointer">
              <X className="h-6 w-6" />
            </button>

            <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
              <Award className="h-5.5 w-5.5 text-violet-400 animate-pulse" />
              <span>Create Evaluation Review</span>
            </h2>

            <form onSubmit={handleCreateReview} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Employee *</label>
                  <select
                    value={revieweeId}
                    onChange={(e) => setRevieweeId(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-violet-500 text-slate-300 text-sm outline-none cursor-pointer"
                  >
                    <option value="">Select Employee</option>
                    {employees
                      .filter((emp) => emp.role === 'EMPLOYEE')
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.designation || 'Staff'})</option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Evaluation Period *</label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-violet-500 text-slate-300 text-sm outline-none cursor-pointer"
                  >
                    <option value="Q1 2026">Q1 2026</option>
                    <option value="Q2 2026">Q2 2026</option>
                    <option value="Q3 2026">Q3 2026</option>
                    <option value="Q4 2026">Q4 2026</option>
                    <option value="Annual 2025">Annual 2025</option>
                  </select>
                </div>
              </div>

              {/* Multi-skill star rating pickers */}
              <div className="space-y-3 bg-slate-950/45 p-4 border border-slate-800 rounded-2xl">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Skill Evaluations</span>
                
                <div className="space-y-3">
                  {/* Technical Skills */}
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-450 font-semibold">Technical Skills</label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setTechnicalSkills(num)}
                          className="hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star 
                            className={`h-5 w-5 ${num <= technicalSkills ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} 
                          />
                        </button>
                      ))}
                      <span className="text-xs font-bold text-slate-400 ml-2 w-8 text-right">{technicalSkills} / 5</span>
                    </div>
                  </div>

                  {/* Communication */}
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-450 font-semibold">Communication</label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setCommunication(num)}
                          className="hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star 
                            className={`h-5 w-5 ${num <= communication ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} 
                          />
                        </button>
                      ))}
                      <span className="text-xs font-bold text-slate-400 ml-2 w-8 text-right">{communication} / 5</span>
                    </div>
                  </div>

                  {/* Teamwork */}
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-450 font-semibold">Teamwork</label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setTeamwork(num)}
                          className="hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star 
                            className={`h-5 w-5 ${num <= teamwork ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} 
                          />
                        </button>
                      ))}
                      <span className="text-xs font-bold text-slate-400 ml-2 w-8 text-right">{teamwork} / 5</span>
                    </div>
                  </div>

                  {/* Problem Solving */}
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-450 font-semibold">Problem Solving</label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setProblemSolving(num)}
                          className="hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star 
                            className={`h-5 w-5 ${num <= problemSolving ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} 
                          />
                        </button>
                      ))}
                      <span className="text-xs font-bold text-slate-400 ml-2 w-8 text-right">{problemSolving} / 5</span>
                    </div>
                  </div>

                  {/* Leadership */}
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-450 font-semibold">Leadership</label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setLeadership(num)}
                          className="hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star 
                            className={`h-5 w-5 ${num <= leadership ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} 
                          />
                        </button>
                      ))}
                      <span className="text-xs font-bold text-slate-400 ml-2 w-8 text-right">{leadership} / 5</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-350">Calculated Overall Rating:</span>
                  <div className="flex items-center gap-1.5 text-sm font-black text-violet-400">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span>{Math.round(((technicalSkills + communication + teamwork + problemSolving + leadership) / 5) * 10) / 10} / 5.0</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Feedback & Comments *</label>
                <textarea
                  required
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-violet-500 text-slate-100 text-sm outline-none h-24 resize-none"
                  placeholder="Detail employee performance, strengths, and areas of growth..."
                />
              </div>

              {/* Dynamic Goals list inputs */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Performance Goals</label>
                  <button
                    type="button"
                    onClick={handleGoalAdd}
                    className="text-violet-400 hover:text-violet-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>Add Goal</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-32 overflow-y-auto bg-slate-950 border border-slate-800 rounded-xl p-3">
                  {goals.map((goal, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={goal}
                        onChange={(e) => handleGoalChange(idx, e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs outline-none"
                        placeholder={`Goal #${idx + 1}`}
                      />
                      {goals.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleGoalRemove(idx)}
                          className="text-slate-500 hover:text-rose-400 cursor-pointer"
                        >
                          <MinusCircle className="h-4.5 w-4.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <button
                  type="submit"
                  onClick={() => setSubmitStatus('DRAFT')}
                  className="w-full py-3 border border-slate-850 hover:border-slate-700 bg-slate-950/60 hover:bg-slate-950 text-slate-300 rounded-2xl font-semibold text-sm transition-all cursor-pointer"
                >
                  Save as Draft
                </button>

                <button
                  type="submit"
                  onClick={() => setSubmitStatus('SUBMITTED')}
                  className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl font-semibold text-sm transition-all shadow-xl shadow-violet-500/10 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Send className="h-4 w-4" />
                  <span>Submit review</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
