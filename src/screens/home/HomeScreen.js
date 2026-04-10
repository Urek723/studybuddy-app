import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { useRefresh } from '../../contexts/RefreshContext';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { refreshKey, subscribeToTable } = useRefresh();

  const [profile, setProfile] = useState(null);
  const [groups, setGroups] = useState([]);
  const [suggestedGroups, setSuggestedGroups] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalHours: 0,
    quizzesCompleted: 0,
    achievements: 0,
  });

  useEffect(() => {
    if (!user) return;
    fetchUserData();

    const unsubGroups = subscribeToTable('group_members', `user_id=eq.${user.id}`, () => {
      fetchUserData();
    });
    const unsubSessions = subscribeToTable('study_sessions', null, () => {
      fetchUserData();
    });
    const unsubProgress = subscribeToTable('study_progress', `user_id=eq.${user.id}`, () => {
      fetchUserData();
    });

    return () => {
      unsubGroups();
      unsubSessions();
      unsubProgress();
    };
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      setProfile(profileData);

      const { data: groupsData } = await supabase
        .from('group_members')
        .select(`
          *,
          study_groups (
            id,
            name,
            description,
            avatar_url,
            subjects (name)
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .limit(3);

      const myGroups = groupsData?.map((gm) => gm.study_groups).filter(Boolean) || [];
      setGroups(myGroups);

      const { data: userSubjects } = await supabase
        .from('user_subjects')
        .select('subject_id')
        .eq('user_id', user.id);

      if (userSubjects?.length > 0) {
        const subjectIds = userSubjects.map((us) => us.subject_id);
        const myGroupIds = myGroups.map((g) => g.id);

        const { data: suggested } = await supabase
          .from('study_groups')
          .select('*, subjects (name)')
          .in('subject_id', subjectIds)
          .not('id', 'in', myGroupIds.length > 0 ? `(${myGroupIds.join(',')})` : '(null)')
          .limit(3);

        setSuggestedGroups(suggested || []);
      }

      const now = new Date().toISOString();
      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('*, study_groups (name)')
        .gte('start_time', now)
        .order('start_time', { ascending: true })
        .limit(3);

      setUpcomingSessions(sessions || []);

      const { data: progressData } = await supabase
        .from('study_progress')
        .select('study_hours')
        .eq('user_id', user.id);

      const totalHours =
        progressData?.reduce((sum, p) => sum + parseFloat(p.study_hours), 0) || 0;

      const { data: quizData } = await supabase
        .from('quiz_attempts')
        .select('id')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null);

      const { data: achievementsData } = await supabase
        .from('user_achievements')
        .select('id')
        .eq('user_id', user.id);

      setStats({
        totalHours: Math.round(totalHours * 10) / 10,
        quizzesCompleted: quizData?.length || 0,
        achievements: achievementsData?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    setRefreshing(false);
  };

  // Fixed: joinGroup now uses 'pending' status to respect approval flow
  const joinGroup = async (groupId) => {
    try {
      const { data: existing } = await supabase
        .from('group_members')
        .select('id, status')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        if (existing.status === 'pending') {
          Alert.alert('Info', 'Your join request is pending approval.');
        } else if (existing.status === 'accepted') {
          Alert.alert('Info', 'You are already a member of this group.');
        }
        return;
      }

      const { error } = await supabase.from('group_members').insert({
        group_id: groupId,
        user_id: user.id,
        role: 'member',
        status: 'pending',
      });

      if (error) throw error;
      Alert.alert('Request Sent', 'Your request to join has been sent.');
    } catch (error) {
      console.error('Error joining group:', error);
      Alert.alert('Error', 'Failed to send join request.');
    }
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.headerCard}>
        <View style={styles.headerContent}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>
              Hello, {profile?.full_name || 'Student'}!
            </Text>
            <Text style={styles.headerSubtext}>Ready to study today?</Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            style={styles.avatarContainer}
          >
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <MaterialCommunityIcons name="account" size={32} color="#6366f1" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="clock-outline" size={24} color="#fff" />
            <Text style={styles.statValue}>{stats.totalHours}h</Text>
            <Text style={styles.statLabel}>Study Time</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="brain" size={24} color="#fff" />
            <Text style={styles.statValue}>{stats.quizzesCompleted}</Text>
            <Text style={styles.statLabel}>Quizzes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="trophy-outline" size={24} color="#fff" />
            <Text style={styles.statValue}>{stats.achievements}</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('CreateGroup')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#dbeafe' }]}>
              <MaterialCommunityIcons name="account-group-outline" size={28} color="#3b82f6" />
            </View>
            <Text style={styles.actionText}>Create Group</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Groups')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#fce7f3' }]}>
              <MaterialCommunityIcons name="magnify" size={28} color="#ec4899" />
            </View>
            <Text style={styles.actionText}>Find Groups</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Calendar')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#dcfce7' }]}>
              <MaterialCommunityIcons name="calendar-plus" size={28} color="#22c55e" />
            </View>
            <Text style={styles.actionText}>Schedule</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Quizzes')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#fef3c7' }]}>
              <MaterialCommunityIcons name="brain" size={28} color="#f59e0b" />
            </View>
            <Text style={styles.actionText}>Quizzes</Text>
          </TouchableOpacity>
        </View>
      </View>

      {groups.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Study Groups</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Groups')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {groups.map((group) => (
            <TouchableOpacity
              key={group.id}
              style={styles.groupCard}
              onPress={() => navigation.navigate('GroupDetail', { groupId: group.id })}
            >
              <View style={styles.groupIcon}>
                {group.avatar_url ? (
                  <Image source={{ uri: group.avatar_url }} style={styles.groupImage} />
                ) : (
                  <MaterialCommunityIcons name="account-group" size={24} color="#6366f1" />
                )}
              </View>
              <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.groupSubject}>{group.subjects?.name || 'General'}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#94a3b8" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {suggestedGroups.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suggested for You</Text>
          {suggestedGroups.map((group) => (
            <View key={group.id} style={styles.suggestedCard}>
              <View style={styles.groupIcon}>
                {group.avatar_url ? (
                  <Image source={{ uri: group.avatar_url }} style={styles.groupImage} />
                ) : (
                  <MaterialCommunityIcons name="account-group" size={24} color="#6366f1" />
                )}
              </View>
              <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.groupSubject}>{group.subjects?.name || 'General'}</Text>
              </View>
              <TouchableOpacity style={styles.joinButton} onPress={() => joinGroup(group.id)}>
                <Text style={styles.joinButtonText}>Join</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {upcomingSessions.length > 0 && (
        <View style={[styles.section, { marginBottom: 24 }]}>
          <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
          {upcomingSessions.map((session) => (
            <View key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionIconContainer}>
                <MaterialCommunityIcons name="calendar-clock" size={24} color="#6366f1" />
              </View>
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionTitle}>{session.title}</Text>
                <Text style={styles.sessionGroup}>{session.study_groups?.name}</Text>
                <Text style={styles.sessionTime}>{formatDate(session.start_time)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerCard: {
    padding: 24,
    paddingTop: 60,
    paddingRight: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  greetingContainer: { flexShrink: 1, maxWidth: '70%' },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  headerSubtext: { fontSize: 14, color: '#e0e7ff', marginTop: 4 },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    borderWidth: 2,
    borderColor: '#ffffff80',
  },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: 'rgba(255, 255, 255, 0.3)' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#e0e7ff', marginTop: 4 },
  section: { padding: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  seeAll: { fontSize: 14, color: '#6366f1', fontWeight: '600' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between' },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: { fontSize: 12, color: '#475569', fontWeight: '600', textAlign: 'center' },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupImage: { width: 48, height: 48, borderRadius: 24 },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  groupSubject: { fontSize: 14, color: '#64748b', marginTop: 2 },
  suggestedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  joinButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  sessionCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sessionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sessionInfo: { flex: 1 },
  sessionTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  sessionGroup: { fontSize: 14, color: '#6366f1', marginTop: 2 },
  sessionTime: { fontSize: 12, color: '#64748b', marginTop: 4 },
});