import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { useRefresh } from '../../contexts/RefreshContext';

export default function QuizzesScreen({ navigation }) {
  const { user } = useAuth();
  const { subscribeToTable } = useRefresh();
  const [quizzes, setQuizzes] = useState([]);
  const [myAttempts, setMyAttempts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('available');

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <MaterialCommunityIcons name="account-circle" size={28} color="#fff" />
        </TouchableOpacity>
        
      ),
    });
  }, [navigation]);

  useEffect(() => {
    fetchData();

    const unsubQuizzes = subscribeToTable('quizzes', null, () => {
      fetchData();
    });

    const unsubAttempts = subscribeToTable('quiz_attempts', `user_id=eq.${user.id}`, () => {
      fetchData();
    });

    return () => {
      unsubQuizzes();
      unsubAttempts();
    };
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: groupsData, error: groupsError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (groupsError) throw groupsError;

      const groupIds = groupsData?.map(g => g.group_id) || [];

      if (groupIds.length === 0) {
        setQuizzes([]);
        setMyAttempts([]);
        return;
      }

      const { data: quizzesData, error: quizzesError } = await supabase
        .from('quizzes')
        .select(`
          *,
          study_groups (name),
          profiles!quizzes_created_by_fkey (full_name),
          quiz_questions (id)
        `)
        .in('group_id', groupIds)
        .order('created_at', { ascending: false });

      if (quizzesError) throw quizzesError;

      setQuizzes(quizzesData || []);

      const quizIds = quizzesData?.map(q => q.id) || [];
      if (quizIds.length > 0) {
        const { data: attemptsData, error: attemptsError } = await supabase
          .from('quiz_attempts')
          .select(`
            *,
            quizzes (
              id,
              title,
              time_limit,
              study_groups (id, name),
              quiz_questions (id)
            )
          `)
          .eq('user_id', user.id)
          .in('quiz_id', quizIds)
          .not('completed_at', 'is', null);

        if (attemptsError) throw attemptsError;

        setMyAttempts(attemptsData || []);
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const hasAttempted = (quizId) => {
    return myAttempts.some(attempt => attempt.quiz_id === quizId);
  };

  const availableQuizzes = quizzes.filter(q => !hasAttempted(q.id));
  const completedQuizzes = myAttempts;

  const renderQuizCard = (item, isCompleted = false) => {
    const quizData = isCompleted ? item.quizzes : item;
    const questionCount = Array.isArray(quizData?.quiz_questions)
      ? quizData.quiz_questions.length
      : 0;

    return (
      <TouchableOpacity
        key={isCompleted ? item.id : quizData.id}
        style={styles.quizCard}
        onPress={() =>
          navigation.navigate('QuizDetail', {
            quizId: isCompleted ? item.quiz_id : quizData.id,
            attemptId: isCompleted ? item.id : null,
          })
        }
      >
        <View style={styles.quizIcon}>
          <MaterialCommunityIcons
            name={isCompleted ? 'check-circle' : 'brain'}
            size={32}
            color={isCompleted ? '#22c55e' : '#6366f1'}
          />
        </View>

        <View style={styles.quizInfo}>
          <Text style={styles.quizTitle}>{quizData?.title}</Text>
          <Text style={styles.quizGroup}>{quizData?.study_groups?.name}</Text>

          {!isCompleted && (
            <View style={styles.quizMeta}>
              <MaterialCommunityIcons name="help-circle-outline" size={14} color="#64748b" />
              <Text style={styles.quizMetaText}>{questionCount} questions</Text>
              {quizData.time_limit && (
                <>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={14}
                    color="#64748b"
                    style={styles.metaIcon}
                  />
                  <Text style={styles.quizMetaText}>{quizData.time_limit} min</Text>
                </>
              )}
            </View>
          )}

          {isCompleted && (
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>Score:</Text>
              <Text style={styles.scoreValue}>
                {item.score}/{item.total_points}
              </Text>
              <Text style={styles.scorePercentage}>
                ({Math.round((item.score / item.total_points) * 100)}%)
              </Text>
            </View>
          )}
        </View>

        {!isCompleted && (
          <View style={styles.startButton}>
            <MaterialCommunityIcons name="play" size={24} color="#6366f1" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <MaterialCommunityIcons name="brain" size={48} color="#fff" />
        <Text style={styles.headerTitle}>Quizzes</Text>
        <Text style={styles.headerSubtitle}>Test your knowledge</Text>
      </LinearGradient>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'available' && styles.activeTab]}
          onPress={() => setActiveTab('available')}
        >
          <Text style={[styles.tabText, activeTab === 'available' && styles.activeTabText]}>
            Available ({availableQuizzes.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
            Completed ({completedQuizzes.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.quizList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'available' ? (
          availableQuizzes.length > 0 ? (
            availableQuizzes.map(q => renderQuizCard(q, false))
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="brain" size={64} color="#cbd5e1" />
              <Text style={styles.emptyStateText}>No quizzes available</Text>
              <Text style={styles.emptyStateSubtext}>
                Check back later or ask your group to create one!
              </Text>
            </View>
          )
        ) : completedQuizzes.length > 0 ? (
          completedQuizzes.map(a => renderQuizCard(a, true))
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyStateText}>No completed quizzes</Text>
            <Text style={styles.emptyStateSubtext}>
              Start taking quizzes to see your results here!
            </Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateQuiz')}>
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerButton: {
    padding: 8,
    marginRight: 8,
  },
  header: { padding: 32, alignItems: 'center', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginTop: 12 },
  headerSubtitle: { fontSize: 14, color: '#e0e7ff', marginTop: 4 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', margin: 16, borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#6366f1' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  activeTabText: { color: '#fff' },
  quizList: { flex: 1, paddingHorizontal: 16 },
  quizCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quizIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quizInfo: { flex: 1 },
  quizTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  quizGroup: { fontSize: 14, color: '#6366f1', marginBottom: 6 },
  quizMeta: { flexDirection: 'row', alignItems: 'center' },
  quizMetaText: { fontSize: 12, color: '#64748b', marginLeft: 4, marginRight: 12 },
  metaIcon: { marginLeft: 8 },
  scoreContainer: { flexDirection: 'row', alignItems: 'center' },
  scoreLabel: { fontSize: 14, color: '#64748b', marginRight: 6 },
  scoreValue: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginRight: 6 },
  scorePercentage: { fontSize: 14, color: '#22c55e', fontWeight: '600' },
  startButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 64 },
  emptyStateText: { fontSize: 18, fontWeight: '600', color: '#64748b', marginTop: 16 },
  emptyStateSubtext: { fontSize: 14, color: '#94a3b8', marginTop: 8, textAlign: 'center' },
  fab: { position: 'absolute', right: 16, bottom: 16, width: 56, height: 56, borderRadius: 28, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', elevation: 4 },
});