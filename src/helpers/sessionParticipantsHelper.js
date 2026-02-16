import { supabase } from '../config/supabase';

export async function fetchSessionParticipants(sessionId) {
  const { data, error } = await supabase
    .from('session_participants')
    .select(`
      id,
      user_id,
      status,
      profiles (
        id,
        full_name,
        avatar_url,
        email
      )
    `)
    .eq('session_id', sessionId);

  if (error) {
    console.error('Error fetching session participants:', error);
    return [];
  }
  return data || [];
}

export async function addSessionParticipant(sessionId, userId, status = 'accepted') {
  const { data, error } = await supabase
    .from('session_participants')
    .upsert({ session_id: sessionId, user_id: userId, status }, { onConflict: 'session_id,user_id' })
    .select()
    .single();

  if (error) {
    console.error('Error adding session participant:', error);
    return null;
  }
  return data;
}

export async function notifyGroupMembersOfSession(session, groupId, createdByUserId) {
  try {
    const { data: members, error } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId)
      .eq('status', 'accepted')
      .neq('user_id', createdByUserId);

    if (error) throw error;
    if (!members || members.length === 0) return;

    const { data: group } = await supabase
      .from('study_groups')
      .select('name')
      .eq('id', groupId)
      .single();

    const sessionDate = new Date(session.start_time).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const notifications = members.map((m) => ({
      user_id: m.user_id,
      sender_id: createdByUserId,
      group_id: groupId,
      type: 'session_created',
      title: 'New Study Session',
      message: `A new session "${session.title}" has been scheduled in ${group?.name} on ${sessionDate}`,
      is_read: false,
    }));

    const { error: notifError } = await supabase.from('notifications').insert(notifications);
    if (notifError) console.error('Error sending session notifications:', notifError);
  } catch (err) {
    console.error('Error notifying group members:', err);
  }
}

export async function getSessionReminderStatus(sessionId, userId) {
  const { data, error } = await supabase
    .from('session_reminders')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function toggleSessionReminder(sessionId, userId, enabled) {
  if (enabled) {
    const { data, error } = await supabase
      .from('session_reminders')
      .upsert({ session_id: sessionId, user_id: userId, enabled: true }, { onConflict: 'session_id,user_id' })
      .select()
      .single();

    if (error) {
      console.error('Error setting reminder:', error);
      return null;
    }
    return data;
  } else {
    const { error } = await supabase
      .from('session_reminders')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing reminder:', error);
      return null;
    }
    return { enabled: false };
  }
}