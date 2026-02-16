import { supabase } from '../config/supabase';

export function startStudySession(userId, groupId) {
  return {
    id: `${userId}-${groupId}-${Date.now()}`,
    user_id: userId,
    group_id: groupId,
    start_time: new Date().toISOString(),
  };
}

export async function endStudySession(session) {
  try {
    const now = new Date();
    const start = new Date(session.start_time);
    const diffHours = (now - start) / 1000 / 3600;

    const { error } = await supabase.from('study_progress').insert([
      {
        user_id: session.user_id,
        group_id: session.group_id || null,
        study_hours: diffHours,
        logged_at: now.toISOString(),
      },
    ]);

    if (error) throw error;

    const newAchievements = await checkAchievements(session.user_id);
    return { success: true, hours: Math.round(diffHours * 10) / 10, newAchievements };
  } catch (err) {
    console.error('Failed to end study session:', err);
    return { success: false, newAchievements: [] };
  }
}

export async function logStudyHours(userId, groupId, hours) {
  try {
    const { error } = await supabase.from('study_progress').insert([
      {
        user_id: userId,
        group_id: groupId || null,
        study_hours: hours,
        logged_at: new Date().toISOString(),
      },
    ]);

    if (error) throw error;

    const newAchievements = await checkAchievements(userId);
    return { success: true, newAchievements };
  } catch (err) {
    console.error('Failed to log study hours:', err);
    return { success: false, newAchievements: [] };
  }
}

export async function getTotalStudyHours(userId, groupId = null) {
  try {
    let query = supabase.from('study_progress').select('study_hours').eq('user_id', userId);
    if (groupId) query = query.eq('group_id', groupId);

    const { data, error } = await query;
    if (error) throw error;

    const total = (data || []).reduce((sum, item) => sum + parseFloat(item.study_hours), 0);
    return Math.round(total * 10) / 10;
  } catch (err) {
    console.error('Failed to fetch total study hours:', err);
    return 0;
  }
}

async function checkAchievements(userId) {
  try {
    const { data: achievements } = await supabase.from('achievements').select('*');
    if (!achievements) return [];

    const { data: earned } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    const earnedIds = (earned || []).map(e => e.achievement_id);
    const totalHours = await getTotalStudyHours(userId);
    const newEarned = [];

    for (const ach of achievements) {
      if (earnedIds.includes(ach.id)) continue;
      if (ach.requirement_type === 'study_hours' && totalHours >= ach.requirement_value) {
        const { error } = await supabase.from('user_achievements').insert([
          { user_id: userId, achievement_id: ach.id, earned_at: new Date().toISOString() },
        ]);
        if (!error) newEarned.push(ach);
      }
    }
    return newEarned;
  } catch (err) {
    console.error('Failed to check achievements:', err);
    return [];
  }
}