import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';

// ============================================================================
// GAME TYPE ICONS AND LABELS
// ============================================================================
const GAME_CONFIG = {
  tictactoe: { icon: 'gamepad-variant', label: 'Tic-Tac-Toe', color: '#6366f1' },
  rockpaperscissors: { icon: 'hand-back-right', label: 'Rock Paper Scissors', color: '#8b5cf6' },
  memory: { icon: 'cards', label: 'Memory Cards', color: '#ec4899' },
  quickmath: { icon: 'calculator', label: 'Quick Math', color: '#f59e0b' },
  speedchallenge: { icon: 'speedometer', label: 'Speed Challenge', color: '#22c55e' },
  quiz: { icon: 'brain', label: 'Quizzes', color: '#3b82f6' },
};

export default function LeaderboardScreen({ route }) {
  const { groupId, groupName } = route.params;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overall'); // 'overall' or game type
  const [rankings, setRankings] = useState([]);
  const [gameTypes, setGameTypes] = useState([]);

  useEffect(() => {
    fetchLeaderboard();
    setupRealtimeSubscription();
  }, [groupId, activeTab]);

  // ============================================================================
  // FETCH LEADERBOARD DATA
  // ============================================================================
  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overall') {
        await fetchOverallRankings();
      } else if (activeTab === 'quizzes') {
        await fetchQuizRankings();
      } else {
        await fetchGameRankings(activeTab);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // OVERALL RANKINGS (All Games + Quizzes Combined)
  // ────────────────────────────────────────────────────────────────────────────
  const fetchOverallRankings = async () => {
    try {
      // Fetch all game scores
      const { data: gameScores, error: gameError } = await supabase
        .from('game_scores')
        .select(`
          id,
          user_id,
          score,
          game_type,
          mode,
          profiles!game_scores_user_id_fkey (full_name, avatar_url)
        `)
        .eq('group_id', groupId);

      if (gameError) throw gameError;

      // Fetch all quiz attempts
      const { data: quizAttempts, error: quizError } = await supabase
        .from('quiz_attempts')
        .select(`
          id,
          user_id,
          score,
          quizzes!inner(group_id),
          profiles!quiz_attempts_user_id_fkey(full_name, avatar_url)
        `)
        .eq('quizzes.group_id', groupId);

      if (quizError) throw quizError;

      // Aggregate scores by user
      const scoreMap = {};

      // Add game scores
      (gameScores || []).forEach((item) => {
        const uid = item.user_id;
        if (!scoreMap[uid]) {
          scoreMap[uid] = {
            user_id: uid,
            name: item.profiles?.full_name || 'User',
            avatar: item.profiles?.avatar_url,
            totalScore: 0,
            gamesPlayed: 0,
            breakdown: {},
          };
        }
        scoreMap[uid].totalScore += item.score || 0;
        scoreMap[uid].gamesPlayed += 1;
        
        // Track breakdown by game type
        const gameType = item.game_type;
        if (!scoreMap[uid].breakdown[gameType]) {
          scoreMap[uid].breakdown[gameType] = { count: 0, score: 0 };
        }
        scoreMap[uid].breakdown[gameType].count += 1;
        scoreMap[uid].breakdown[gameType].score += item.score || 0;
      });

      // Add quiz scores
      (quizAttempts || []).forEach((item) => {
        const uid = item.user_id;
        if (!scoreMap[uid]) {
          scoreMap[uid] = {
            user_id: uid,
            name: item.profiles?.full_name || 'User',
            avatar: item.profiles?.avatar_url,
            totalScore: 0,
            gamesPlayed: 0,
            breakdown: {},
          };
        }
        scoreMap[uid].totalScore += item.score || 0;
        scoreMap[uid].gamesPlayed += 1;
        
        if (!scoreMap[uid].breakdown.quiz) {
          scoreMap[uid].breakdown.quiz = { count: 0, score: 0 };
        }
        scoreMap[uid].breakdown.quiz.count += 1;
        scoreMap[uid].breakdown.quiz.score += item.score || 0;
      });

      // Convert to array and sort
      const rankingArray = Object.values(scoreMap)
        .sort((a, b) => b.totalScore - a.totalScore)
        .map((item, index) => ({
          ...item,
          rank: index + 1,
        }));

      setRankings(rankingArray);

      // Extract available game types
      const types = new Set();
      gameScores?.forEach(s => types.add(s.game_type));
      if (quizAttempts?.length > 0) types.add('quizzes');
      setGameTypes(Array.from(types));

    } catch (error) {
      console.error('Error fetching overall rankings:', error);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // GAME-SPECIFIC RANKINGS
  // ────────────────────────────────────────────────────────────────────────────
  const fetchGameRankings = async (gameType) => {
    try {
      const { data, error } = await supabase
        .from('game_scores')
        .select(`
          id,
          user_id,
          score,
          mode,
          played_at,
          profiles!game_scores_user_id_fkey (full_name, avatar_url)
        `)
        .eq('group_id', groupId)
        .eq('game_type', gameType)
        .order('score', { ascending: false });

      if (error) throw error;

      // Aggregate by user
      const scoreMap = {};
      (data || []).forEach((item) => {
        const uid = item.user_id;
        if (!scoreMap[uid]) {
          scoreMap[uid] = {
            user_id: uid,
            name: item.profiles?.full_name || 'User',
            avatar: item.profiles?.avatar_url,
            bestScore: 0,
            totalScore: 0,
            gamesPlayed: 0,
            lastPlayed: item.played_at,
          };
        }
        scoreMap[uid].totalScore += item.score || 0;
        scoreMap[uid].gamesPlayed += 1;
        if (item.score > scoreMap[uid].bestScore) {
          scoreMap[uid].bestScore = item.score;
        }
        // Update last played if newer
        if (new Date(item.played_at) > new Date(scoreMap[uid].lastPlayed)) {
          scoreMap[uid].lastPlayed = item.played_at;
        }
      });

      const rankingArray = Object.values(scoreMap)
        .sort((a, b) => b.bestScore - a.bestScore)
        .map((item, index) => ({
          ...item,
          rank: index + 1,
        }));

      setRankings(rankingArray);
    } catch (error) {
      console.error('Error fetching game rankings:', error);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // QUIZ-SPECIFIC RANKINGS
  // ────────────────────────────────────────────────────────────────────────────
  const fetchQuizRankings = async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select(`
          id,
          user_id,
          score,
          total_points,
          completed_at,
          quizzes!inner(group_id),
          profiles!quiz_attempts_user_id_fkey(full_name, avatar_url)
        `)
        .eq('quizzes.group_id', groupId);

      if (error) throw error;

      const scoreMap = {};
      (data || []).forEach((item) => {
        const uid = item.user_id;
        if (!scoreMap[uid]) {
          scoreMap[uid] = {
            user_id: uid,
            name: item.profiles?.full_name || 'User',
            avatar: item.profiles?.avatar_url,
            totalScore: 0,
            quizzesTaken: 0,
            avgPercentage: 0,
          };
        }
        scoreMap[uid].totalScore += item.score || 0;
        scoreMap[uid].quizzesTaken += 1;
      });

      // Calculate average percentage
      Object.values(scoreMap).forEach(user => {
        const attempts = data.filter(a => a.user_id === user.user_id);
        const totalPercentage = attempts.reduce((sum, a) => {
          return sum + ((a.score / a.total_points) * 100);
        }, 0);
        user.avgPercentage = Math.round(totalPercentage / attempts.length);
      });

      const rankingArray = Object.values(scoreMap)
        .sort((a, b) => b.totalScore - a.totalScore)
        .map((item, index) => ({
          ...item,
          rank: index + 1,
        }));

      setRankings(rankingArray);
    } catch (error) {
      console.error('Error fetching quiz rankings:', error);
    }
  };

  // ============================================================================
  // REAL-TIME UPDATES
  // ============================================================================
  const setupRealtimeSubscription = () => {
    // Subscribe to game_scores changes
    const gameScoresChannel = supabase
      .channel('game_scores_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_scores',
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          console.log('Game score updated - refreshing leaderboard');
          fetchLeaderboard();
        }
      )
      .subscribe();

    // Subscribe to quiz_attempts changes
    const quizAttemptsChannel = supabase
      .channel('quiz_attempts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_attempts',
        },
        () => {
          console.log('Quiz attempt updated - refreshing leaderboard');
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gameScoresChannel);
      supabase.removeChannel(quizAttemptsChannel);
    };
  };

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  const renderRankItem = ({ item }) => {
    const isCurrentUser = item.user_id === user.id;
    const config = GAME_CONFIG[activeTab] || {};

    return (
      <View style={[styles.rankCard, isCurrentUser && styles.currentUserCard]}>
        {/* Rank Badge */}
        <View style={[
          styles.rankBadge,
          item.rank === 1 && styles.rank1,
          item.rank === 2 && styles.rank2,
          item.rank === 3 && styles.rank3,
        ]}>
          {item.rank <= 3 ? (
            <MaterialCommunityIcons
              name={item.rank === 1 ? 'trophy' : item.rank === 2 ? 'medal' : 'medal-outline'}
              size={24}
              color={item.rank === 1 ? '#fbbf24' : item.rank === 2 ? '#94a3b8' : '#d97706'}
            />
          ) : (
            <Text style={styles.rankNumber}>{item.rank}</Text>
          )}
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {item.name} {isCurrentUser && '(You)'}
          </Text>
          
          {activeTab === 'overall' && (
            <Text style={styles.userSubtext}>
              {item.gamesPlayed} games played
            </Text>
          )}
          
          {activeTab === 'quizzes' && (
            <Text style={styles.userSubtext}>
              {item.quizzesTaken} quizzes • {item.avgPercentage}% avg
            </Text>
          )}
          
          {activeTab !== 'overall' && activeTab !== 'quizzes' && (
            <Text style={styles.userSubtext}>
              Best: {item.bestScore} • Played: {item.gamesPlayed}
            </Text>
          )}
        </View>

        {/* Score */}
        <View style={styles.scoreContainer}>
          {activeTab === 'overall' && (
            <Text style={styles.scoreValue}>{item.totalScore}</Text>
          )}
          {activeTab === 'quizzes' && (
            <Text style={styles.scoreValue}>{item.totalScore}</Text>
          )}
          {activeTab !== 'overall' && activeTab !== 'quizzes' && (
            <Text style={styles.scoreValue}>{item.bestScore}</Text>
          )}
          <Text style={styles.scoreLabel}>points</Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="trophy-outline" size={64} color="#cbd5e1" />
      <Text style={styles.emptyTitle}>No scores yet</Text>
      <Text style={styles.emptySubtext}>
        Be the first to play and top the leaderboard!
      </Text>
    </View>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="trophy" size={32} color="#fbbf24" />
        <Text style={styles.headerTitle}>{groupName}</Text>
        <Text style={styles.headerSubtitle}>Leaderboard</Text>
      </View>

      {/* Tab Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabContainer}
      >
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overall' && styles.activeTab]}
          onPress={() => setActiveTab('overall')}
        >
          <MaterialCommunityIcons
            name="trophy-variant"
            size={20}
            color={activeTab === 'overall' ? '#fff' : '#64748b'}
          />
          <Text style={[styles.tabText, activeTab === 'overall' && styles.activeTabText]}>
            Overall
          </Text>
        </TouchableOpacity>

        {gameTypes.includes('quizzes') && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'quizzes' && styles.activeTab]}
            onPress={() => setActiveTab('quizzes')}
          >
            <MaterialCommunityIcons
              name={GAME_CONFIG.quiz.icon}
              size={20}
              color={activeTab === 'quizzes' ? '#fff' : '#64748b'}
            />
            <Text style={[styles.tabText, activeTab === 'quizzes' && styles.activeTabText]}>
              Quizzes
            </Text>
          </TouchableOpacity>
        )}

        {gameTypes.filter(t => t !== 'quizzes').map((gameType) => {
          const config = GAME_CONFIG[gameType];
          if (!config) return null;
          
          return (
            <TouchableOpacity
              key={gameType}
              style={[styles.tab, activeTab === gameType && styles.activeTab]}
              onPress={() => setActiveTab(gameType)}
            >
              <MaterialCommunityIcons
                name={config.icon}
                size={20}
                color={activeTab === gameType ? '#fff' : '#64748b'}
              />
              <Text style={[styles.tabText, activeTab === gameType && styles.activeTabText]}>
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Rankings List */}
      <FlatList
        data={rankings}
        keyExtractor={(item) => item.user_id}
        renderItem={renderRankItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Stats Footer */}
      {rankings.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.footerStat}>
            <Text style={styles.footerValue}>{rankings.length}</Text>
            <Text style={styles.footerLabel}>Players</Text>
          </View>
          <View style={styles.footerDivider} />
          <View style={styles.footerStat}>
            <Text style={styles.footerValue}>
              {rankings.reduce((sum, r) => sum + (r.gamesPlayed || r.quizzesTaken || 0), 0)}
            </Text>
            <Text style={styles.footerLabel}>Total Games</Text>
          </View>
          <View style={styles.footerDivider} />
          <View style={styles.footerStat}>
            <Text style={styles.footerValue}>
              {Math.max(...rankings.map(r => r.totalScore || r.bestScore || 0))}
            </Text>
            <Text style={styles.footerLabel}>High Score</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    backgroundColor: '#6366f1',
    padding: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0e7ff',
    marginTop: 4,
  },
  tabScroll: {
    maxHeight: 60,
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
    elevation: 1,
  },
  activeTab: {
    backgroundColor: '#6366f1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  rankCard: {
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
  currentUserCard: {
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  rankBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rank1: {
    backgroundColor: '#fef3c7',
  },
  rank2: {
    backgroundColor: '#f1f5f9',
  },
  rank3: {
    backgroundColor: '#fed7aa',
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#475569',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  userSubtext: {
    fontSize: 12,
    color: '#64748b',
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6366f1',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerStat: {
    flex: 1,
    alignItems: 'center',
  },
  footerValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  footerLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  footerDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
  },
});