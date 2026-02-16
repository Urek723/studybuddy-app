import { supabase } from '../config/supabase';
import { filterActiveSessions } from './sessionCleanupHelper';

/**
 * Fetch all sessions for a specific user (their groups)
 * @param {string} userId
 * @returns {Promise<Array>} Array of sessions
 */
export async function fetchGroupSessions(userId) {
  const { data, error } = await supabase
    .from('study_sessions')
    .select(`
      *,
      study_groups(name)
    `)
    .in(
      'group_id',
      (
        await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', userId)
      ).data.map((g) => g.group_id)
    )
    .order('start_time', { ascending: true });

  if (error) {
    console.error('fetchGroupSessions error:', error);
    return [];
  }

  // ⭐ CLEANUP HAPPENS HERE
  return filterActiveSessions(data);
}


/**
 * Check if a new session overlaps with existing sessions for the same group
 * Only checks sessions on the same date as startISO
 * @param {string} groupId
 * @param {string} startISO - Start time in ISO format
 * @param {string} endISO - End time in ISO format
 * @returns {Promise<Array>} overlapping sessions
 */
export async function isTimeOverlap(groupId, startISO, endISO) {
  try {
    const startDate = new Date(startISO);
    const endDate = new Date(endISO);

    // Extract the date part (YYYY-MM-DD) for filtering
    const dateStr = startDate.toISOString().split('T')[0];

    // Fetch only sessions for this group on the same date
    const { data: sessions, error } = await supabase
      .from('study_sessions')
      .select('id, title, start_time, end_time')
      .eq('group_id', groupId)
      .gte('start_time', `${dateStr}T00:00:00`)
      .lte('start_time', `${dateStr}T23:59:59`);

    if (error) throw error;

    // Filter for overlapping times
    const overlapping = sessions.filter((s) => {
      const sStart = new Date(s.start_time);
      const sEnd = new Date(s.end_time);
      return startDate < sEnd && endDate > sStart;
    });

    return overlapping;
  } catch (err) {
    console.error('Error checking session overlap:', err);
    return [];
  }
}

/**
 * Subscribe to session changes (create, update, delete)
 * @param {string} userId
 * @param {function} callback - called with updated sessions array
 * @returns {function} unsubscribe function
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

