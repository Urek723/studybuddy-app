import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import StudyTimerComponent from '../../components/StudyTimerComponent';
import { useRefresh } from '../../contexts/RefreshContext';
import { checkAndUnlockAchievements } from '../../helpers/checkAndUnlockAchievements';

const screenWidth = Dimensions.get('window').width;

const iconMap = {
  first_quiz: 'trophy',
  daily_streak: 'star',
  brain_boost: 'brain',
  study_clock: 'clock-outline',
};

const getValidIcon = (iconName) => {
  if (!iconName || typeof iconName !== 'string') return 'trophy';
  return iconMap[iconName] || iconName;
};

export default function ProgressScreen({ navigation }) {
  const { refreshKey } = useRefresh();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalHours: 0,
    weeklyHours: [],
    quizzesCompleted: 0,
    averageScore: 0,
    achievements: [],
    recentScores: [],
  });

  const timerRunningRef = useRef(false);

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
    if (!timerRunningRef.current) {
      fetchProgress();
    }
  }, [refreshKey]);

  const calculateStats = (progressData, quizData, achievementsData) => {
    const totalHours = (progressData || []).reduce(
      (sum, p) => sum + parseFloat(p.study_hours || 0),
      0
    );
    const last7Days = (progressData || []).slice(0, 7).reverse();
    const weeklyHours = last7Days.map((p) => parseFloat(p.study_hours || 0));
    const quizzesCompleted = (quizData || []).length;
    const averageScore = quizData?.length
      ? Math.round(
          quizData.reduce(
            (sum, q) => sum + ((q.score || 0) / (q.total_points || 1)) * 100,
            0
          ) / quizData.length
        )
      : 0;
    const recentScores = (quizData || [])
      .slice(0, 5)
      .reverse()
      .map((q) => Math.round(((q.score || 0) / (q.total_points || 1)) * 100));

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      weeklyHours,
      quizzesCompleted,
      averageScore,
      achievements: achievementsData || [],
      recentScores,
    };
  };

  const fetchProgress = async () => {
    try {
      const { data: progressData } = await supabase
        .from('study_progress')
        .select('study_hours, logged_at')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(30);

      const { data: quizData } = await supabase
        .from('quiz_attempts')
        .select('score, total_points, completed_at')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      const newAchievements = await checkAndUnlockAchievements(user.id);

      const { data: achievementsData } = await supabase
        .from('user_achievements')
        .select('*, achievements (name, description, icon)')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      const calculatedStats = calculateStats(progressData, quizData, achievementsData);
      setStats(calculatedStats);

      // Fixed: use Alert.alert instead of global alert()
      if (newAchievements.length > 0) {
        newAchievements.forEach((a) => {
          Alert.alert('🎉 Achievement Unlocked!', a.name);
        });
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  };

  const handleTimerStart = () => {
    timerRunningRef.current = true;
  };

  const handleTimerStop = () => {
    timerRunningRef.current = false;
    fetchProgress();
  };

  const chartConfig = {
    backgroundColor: '#6366f1',
    backgroundGradientFrom: '#6366f1',
    backgroundGradientTo: '#8b5cf6',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: '6', strokeWidth: '2', stroke: '#fff' },
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <MaterialCommunityIcons name="chart-line" size={48} color="#fff" />
        <Text style={styles.headerTitle}>Your Progress</Text>
        <Text style={styles.headerSubtitle}>Keep up the great work!</Text>
      </LinearGradient>

      <StudyTimerComponent
        groupId={null}
        navigation={navigation}
        onTimerStart={handleTimerStart}
        onTimerStop={handleTimerStop}
        onAchievementsUpdate={fetchProgress}
      />

      <View style={styles.statsContainer}>
        <StatCard
          icon="clock-outline"
          iconBg="#dbeafe"
          iconColor="#3b82f6"
          value={`${stats.totalHours}h`}
          label="Total Study Time"
        />
        <StatCard
          icon="brain"
          iconBg="#fef3c7"
          iconColor="#f59e0b"
          value={`${stats.quizzesCompleted}`}
          label="Quizzes Done"
        />
        <StatCard
          icon="percent"
          iconBg="#dcfce7"
          iconColor="#22c55e"
          value={`${stats.averageScore}%`}
          label="Avg Score"
        />
      </View>

      {stats.weeklyHours.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Weekly Study Hours</Text>
          <BarChart
            data={{
              labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].slice(
                0,
                stats.weeklyHours.length
              ),
              datasets: [{ data: stats.weeklyHours.length > 0 ? stats.weeklyHours : [0] }],
            }}
            width={screenWidth - 32}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            fromZero
          />
        </View>
      )}

      {stats.recentScores.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Recent Quiz Scores</Text>
          <LineChart
            data={{
              labels: stats.recentScores.map((_, i) => `Q${i + 1}`),
              datasets: [{ data: stats.recentScores.length > 0 ? stats.recentScores : [0] }],
            }}
            width={screenWidth - 32}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Achievements ({stats.achievements.length})</Text>
        {stats.achievements.length > 0
          ? stats.achievements.map((a) => <AchievementCard key={a.id} achievement={a} />)
          : <EmptyAchievements />}
      </View>

      <View style={styles.motivationCard}>
        <MaterialCommunityIcons name="star" size={24} color="#f59e0b" />
        <Text style={styles.motivationText}>
          You're doing great! Keep studying and learning together.
        </Text>
      </View>
    </ScrollView>
  );
}

const StatCard = ({ icon, iconBg, iconColor, value, label }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
      <MaterialCommunityIcons name={icon} size={32} color={iconColor} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const AchievementCard = ({ achievement }) => {
  const iconName = getValidIcon(achievement.achievements?.icon);
  return (
    <View style={styles.achievementCard}>
      <View style={styles.achievementIcon}>
        <MaterialCommunityIcons name={iconName} size={32} color="#f59e0b" />
      </View>
      <View style={styles.achievementInfo}>
        <Text style={styles.achievementName}>{achievement.achievements?.name}</Text>
        <Text style={styles.achievementDescription}>{achievement.achievements?.description}</Text>
        <Text style={styles.achievementDate}>
          Earned {new Date(achievement.earned_at).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
};

const EmptyAchievements = () => (
  <View style={styles.emptyState}>
    <MaterialCommunityIcons name="trophy-outline" size={48} color="#cbd5e1" />
    <Text style={styles.emptyStateText}>No achievements yet</Text>
    <Text style={styles.emptyStateSubtext}>Keep studying to unlock badges!</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerButton: { padding: 8, marginRight: 8 },
  header: {
    padding: 32,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginTop: 12 },
  headerSubtitle: { fontSize: 14, color: '#e0e7ff', marginTop: 4 },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 24, gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#64748b', textAlign: 'center' },
  chartContainer: { paddingHorizontal: 16, marginBottom: 24 },
  chartTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 12 },
  chart: { borderRadius: 16 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  achievementCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
  },
  achievementIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementInfo: { flex: 1 },
  achievementName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  achievementDescription: { fontSize: 14, color: '#64748b', marginBottom: 4 },
  achievementDate: { fontSize: 12, color: '#94a3b8' },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyStateText: { fontSize: 16, fontWeight: '600', color: '#64748b', marginTop: 12 },
  emptyStateSubtext: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  motivationCard: {
    flexDirection: 'row',
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  motivationText: { flex: 1, fontSize: 14, color: '#92400e', marginLeft: 12, lineHeight: 20 },
});