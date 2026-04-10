import { supabase } from '../config/supabase';
import { filterActiveSessions } from './sessionCleanupHelper';

/**
 * Fetch all sessions for a specific user (their groups)
 * FIX #4: guard the nested async so a failed group query doesn't crash
 */
export async function fetchGroupSessions(userId) {
  try {
    const { data: memberships, error: memberError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);

    if (memberError) {
      console.error('fetchGroupSessions membership error:', memberError);
      return [];
    }

    const groupIds = (memberships || []).map((g) => g.group_id);
    if (groupIds.length === 0) return [];

    const { data, error } = await supabase
      .from('study_sessions')
      .select('*, study_groups(name)')
      .in('group_id', groupIds)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('fetchGroupSessions error:', error);
      return [];
    }

    return filterActiveSessions(data);
  } catch (err) {
    console.error('fetchGroupSessions unexpected error:', err);
    return [];
  }
}

/**
 * Check if a new session overlaps with existing sessions for the same group
 */
export async function isTimeOverlap(groupId, startISO, endISO) {
  try {
    const startDate = new Date(startISO);
    const endDate = new Date(endISO);
    const dateStr = startDate.toISOString().split('T')[0];

    const { data: sessions, error } = await supabase
      .from('study_sessions')
      .select('id, title, start_time, end_time')
      .eq('group_id', groupId)
      .gte('start_time', `${dateStr}T00:00:00`)
      .lte('start_time', `${dateStr}T23:59:59`);

    if (error) throw error;

    return sessions.filter((s) => {
      const sStart = new Date(s.start_time);
      const sEnd = new Date(s.end_time);
      return startDate < sEnd && endDate > sStart;
    });
  } catch (err) {
    console.error('Error checking session overlap:', err);
    return [];
  }
}

/**
 * Subscribe to session changes
 */
export function subscribeSessions(userId, callback) {
  const channel = supabase
    .channel('study_sessions_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'study_sessions' },
      async () => {
        const sessions = await fetchGroupSessions(userId);
        callback(sessions);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}