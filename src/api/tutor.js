import { supabase } from '../supabase';

let dailyReportsEnabled = true;

export async function createAssignment({ creatorId, title, description = '', dueDate = null, maxScore = 5 }) {
  const { data, error } = await supabase
    .from('tutor_assignments')
    .insert([{ creator_id: creatorId, title, description, due_date: dueDate, max_score: maxScore }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAssignments(creatorId = null) {
  let q = supabase.from('tutor_assignments').select('*').order('created_at', { ascending: false });
  if (creatorId) q = q.eq('creator_id', creatorId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function submitAssignment({ assignmentId, userId, content }) {
  const { data, error } = await supabase
    .from('assignment_submissions')
    .insert([{ assignment_id: assignmentId, user_id: userId, content }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function gradeSubmission({ submissionId, score, feedback = '' }) {
  const { data, error } = await supabase
    .from('assignment_submissions')
    .update({ score, feedback })
    .eq('id', submissionId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function logStudyTime({ userId, minutes = 0, date = null }) {
  const d = date ? new Date(date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  // upsert minutes (add to existing)
  const { data: existing } = await supabase
    .from('daily_study_time')
    .select('*')
    .eq('user_id', userId)
    .eq('date', d)
    .single();

  if (existing) {
    const newMinutes = (existing.minutes || 0) + minutes;
    const { data, error } = await supabase
      .from('daily_study_time')
      .update({ minutes: newMinutes, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('daily_study_time')
      .insert([{ user_id: userId, date: d, minutes }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export async function getStudyTime({ userId, date = null }) {
  const d = date ? new Date(date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('daily_study_time')
    .select('*')
    .eq('user_id', userId)
    .eq('date', d)
    .single();
  if (error && error.code !== 'PGRST116') throw error; // ignore not found
  return data || { minutes: 0 };
}

export async function setDailyRating({ userId, date = null, rating = 0, note = '' }) {
  const d = date ? new Date(date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const { data: existing } = await supabase
    .from('student_daily_rating')
    .select('*')
    .eq('user_id', userId)
    .eq('date', d)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('student_daily_rating')
      .update({ rating, note, rated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('student_daily_rating')
    .insert([{ user_id: userId, date: d, rating, note }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getDailyRating({ userId, date = null }) {
  const d = date ? new Date(date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('student_daily_rating')
    .select('*')
    .eq('user_id', userId)
    .eq('date', d)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || { rating: null };
}

// --- Daily reports & real-time evaluation helpers
export async function upsertDailyReport({ userId, date = null, current_grade = null, topics = [], teacher_notes = '', status = 'active' }) {
  if (!dailyReportsEnabled) return null;
  const d = date ? new Date(date).toISOString().slice(0,10) : new Date().toISOString().slice(0,10);
  const { data: existing, error: existingError } = await supabase
    .from('daily_reports')
    .select('*')
    .eq('user_id', userId)
    .eq('date', d)
    .maybeSingle();

  // maybeSingle returns null when no row exists; continue if existing is null

  if (existing) {
    const payload = { updated_at: new Date().toISOString() };
    if (current_grade !== null) payload.current_grade = current_grade;
    if (topics && topics.length) payload.topics_covered = existing.topics_covered ? Array.from(new Set([...(existing.topics_covered || []), ...topics])) : topics;
    if (teacher_notes) payload.teacher_notes = teacher_notes;
    if (status) payload.status = status;

    const { data, error } = await supabase
      .from('daily_reports')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('daily_reports')
    .insert([{ user_id: userId, date: d, current_grade, topics_covered: topics, teacher_notes, status }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getDailyReport({ userId, date = null }) {
  if (!dailyReportsEnabled) return null;
  const d = date ? new Date(date).toISOString().slice(0,10) : new Date().toISOString().slice(0,10);
  const { data, error } = await supabase
    .from('daily_reports')
    .select('*')
    .eq('user_id', userId)
    .eq('date', d)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function recordMessageEvaluation({ userId, messageGrade, topics = [], note = '' }) {
  if (!dailyReportsEnabled) return null;
  const d = new Date().toISOString().slice(0,10);
  const { data: existing, error: existingError } = await supabase
    .from('daily_reports')
    .select('*')
    .eq('user_id', userId)
    .eq('date', d)
    .maybeSingle();

  // maybeSingle returns null when no row exists; continue if existing is null

  if (existing) {
    const prevCount = existing.eval_count || 0;
    const prevGrade = existing.current_grade || 0;
    const newCount = prevCount + 1;
    const newGrade = ((prevGrade * prevCount) + (messageGrade || 0)) / newCount;
    const topicsCombined = existing.topics_covered ? Array.from(new Set([...(existing.topics_covered || []), ...topics])) : topics;
    const { data, error } = await supabase
      .from('daily_reports')
      .update({ current_grade: newGrade, eval_count: newCount, topics_covered: topicsCombined, teacher_notes: note ? (existing.teacher_notes ? existing.teacher_notes + '\n' + note : note) : existing.teacher_notes, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('daily_reports')
    .insert([{ user_id: userId, date: d, current_grade: messageGrade || null, eval_count: 1, topics_covered: topics, teacher_notes: note }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getDailyProgress({ userId }) {
  try {
    const today = new Date().toISOString().slice(0,10);
    const [{ data: submissions, error: submissionsError }, { data: assignments, error: assignmentsError }] = await Promise.all([
      supabase.from('assignment_submissions').select('id').eq('user_id', userId).gte('submitted_at', today + 'T00:00:00').lt('submitted_at', today + 'T23:59:59'),
      supabase.from('tutor_assignments').select('id')
    ]);

    if (submissionsError || assignmentsError) {
      return { percent: 0, submissions: 0, assignments: 0 };
    }

    const sCount = (submissions && submissions.length) || 0;
    const aCount = (assignments && assignments.length) || 0;
    const percent = aCount === 0 ? 0 : Math.round((sCount / aCount) * 100);
    return { percent, submissions: sCount, assignments: aCount };
  } catch (e) {
    return { percent: 0, submissions: 0, assignments: 0 };
  }
}
