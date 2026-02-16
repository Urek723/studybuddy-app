import { supabase } from '../config/supabase';

export const checkAndUnlockAchievements = async (userId) => {
  if (!userId) return [];

  try {
    const [
      { data: studyProgress },
      { data: groupsCreated },
      { data: groupsJoined },
      { data: quizAttempts },
      { data: messagesSent },
      { data: discussionsStarted },
    ] = await Promise.all([
      supabase.from('study_progress').select('study_hours').eq('user_id', userId),
      supabase.from('study_groups').select('id').eq('created_by', userId),
      supabase.from('group_members').select('id').eq('user_id', userId).eq('status', 'accepted'),
      supabase.from('quiz_attempts').select('id').eq('user_id', userId),
      supabase.from('messages').select('id').eq('user_id', userId),
      supabase.from('study_sessions').select('id').eq('created_by', userId),
    ]);

    const totalStudyHours = (studyProgress || []).reduce((sum, p) => sum + parseFloat(p.study_hours), 0);
    const totalGroupsCreated = (groupsCreated || []).length;
    const totalGroupsJoined = (groupsJoined || []).length;
    const totalQuizzes = (quizAttempts || []).length;
    const totalMessages = (messagesSent || []).length;
    const totalDiscussions = (discussionsStarted || []).length;

    const { data: achievements } = await supabase.from('achievements').select('*');
    if (!achievements) return [];

    const { data: unlocked } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    const unlockedIds = (unlocked || []).map(u => u.achievement_id);

    const toUnlock = achievements.filter(a => {
      if (unlockedIds.includes(a.id)) return false;
      switch (a.requirement_type) {
        case 'study_hours':         return totalStudyHours >= a.requirement_value;
        case 'groups_created':      return totalGroupsCreated >= a.requirement_value;
        case 'groups_joined':       return totalGroupsJoined >= a.requirement_value;
        case 'quizzes_attempted':   return totalQuizzes >= a.requirement_value;
        case 'messages_sent':       return totalMessages >= a.requirement_value;
        case 'discussions_started': return totalDiscussions >= a.requirement_value;
        default:                    return false;
      }
    });

    if (toUnlock.length > 0) {
      const inserts = toUnlock.map(a => ({ user_id: userId, achievement_id: a.id }));
      await supabase.from('user_achievements').insert(inserts);
    }

    return toUnlock;
  } catch (error) {
    console.error('Error checking achievements:', error);
    return [];
  }
};