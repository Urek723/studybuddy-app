import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';

export default function QuizDetailScreen({ route, navigation }) {
  const { quizId, attemptId } = route.params;
  const { user } = useAuth();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuizDetails();
  }, [quizId]);

  const fetchQuizDetails = async () => {
    try {
      // Fetch quiz
      const { data: quizData } = await supabase
        .from('quizzes')
        .select(`
          *,
          study_groups (name),
          profiles!quizzes_created_by_fkey (full_name)
        `)
        .eq('id', quizId)
        .single();

      setQuiz(quizData);

      // Fetch questions
      const { data: questionsData } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index', { ascending: true });

      setQuestions(questionsData || []);

      // Check if user has attempted
      if (attemptId) {
        const { data: attemptData } = await supabase
          .from('quiz_attempts')
          .select(`
            *,
            quiz_answers (*)
          `)
          .eq('id', attemptId)
          .single();

        setAttempt(attemptData);
      } else {
        const { data: attemptData } = await supabase
          .from('quiz_attempts')
          .select('*')
          .eq('quiz_id', quizId)
          .eq('user_id', user.id)
          .not('completed_at', 'is', null)
          .single();

        setAttempt(attemptData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching quiz:', error);
      setLoading(false);
    }
  };

  const startQuiz = () => {
    if (attempt) {
      Alert.alert(
        'Already Completed',
        'You have already taken this quiz. Do you want to retake it?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Retake',
            onPress: () => navigation.navigate('TakeQuiz', { quizId }),
          },
        ]
      );
    } else {
      navigation.navigate('TakeQuiz', { quizId });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const percentage = attempt
    ? Math.round((attempt.score / attempt.total_points) * 100)
    : 0;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="brain" size={48} color="#fff" />
        </View>
        <Text style={styles.title}>{quiz?.title}</Text>
        {quiz?.description && (
          <Text style={styles.description}>{quiz.description}</Text>
        )}
        
        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="help-circle-outline" size={16} color="#e0e7ff" />
            <Text style={styles.metaText}>{questions.length} questions</Text>
          </View>
          {quiz?.time_limit && (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#e0e7ff" />
              <Text style={styles.metaText}>{quiz.time_limit} min</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Score (if completed) */}
      {attempt && (
        <View style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <Text style={styles.scoreTitle}>Your Score</Text>
            <MaterialCommunityIcons name="check-circle" size={24} color="#22c55e" />
          </View>
          <View style={styles.scoreDisplay}>
            <Text style={styles.scoreValue}>{percentage}%</Text>
            <Text style={styles.scoreDetail}>
              {attempt.score} / {attempt.total_points} points
            </Text>
          </View>
          <View style={styles.scoreBar}>
            <View style={[styles.scoreProgress, { width: `${percentage}%` }]} />
          </View>
        </View>
      )}

      {/* Quiz Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quiz Information</Text>
        
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="account-group" size={20} color="#64748b" />
          <Text style={styles.infoText}>{quiz?.study_groups?.name}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="account" size={20} color="#64748b" />
          <Text style={styles.infoText}>
            Created by {quiz?.profiles?.full_name}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="calendar" size={20} color="#64748b" />
          <Text style={styles.infoText}>
            {new Date(quiz?.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* Questions Preview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Questions ({questions.length})</Text>
        {questions.map((question, index) => (
          <View key={question.id} style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <Text style={styles.questionNumber}>Q{index + 1}</Text>
              <Text style={styles.questionPoints}>{question.points} pts</Text>
            </View>
            <Text style={styles.questionText}>{question.question}</Text>
            
            {!attempt && (
              <Text style={styles.questionHint}>
                {question.options?.length || 4} options
              </Text>
            )}

            {attempt && (
              <View style={styles.answerPreview}>
                {question.options?.map((option, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.optionPreview,
                      idx === question.correct_answer && styles.correctOption,
                    ]}
                  >
                    <Text style={styles.optionText}>{option}</Text>
                    {idx === question.correct_answer && (
                      <MaterialCommunityIcons name="check" size={16} color="#22c55e" />
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Start/Retake Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.startButton} onPress={startQuiz}>
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            style={styles.startButtonGradient}
          >
            <MaterialCommunityIcons name={attempt ? 'refresh' : 'play'} size={24} color="#fff" />
            <Text style={styles.startButtonText}>
              {attempt ? 'Retake Quiz' : 'Start Quiz'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 32,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#e0e7ff',
    textAlign: 'center',
    marginBottom: 16,
  },
  metaContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: '#e0e7ff',
  },
  scoreCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -24,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  scoreDisplay: {
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  scoreDetail: {
    fontSize: 14,
    color: '#64748b',
  },
  scoreBar: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreProgress: {
    height: '100%',
    backgroundColor: '#22c55e',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1e293b',
    marginLeft: 12,
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  questionPoints: {
    fontSize: 12,
    color: '#64748b',
  },
  questionText: {
    fontSize: 16,
    color: '#1e293b',
    lineHeight: 24,
    marginBottom: 8,
  },
  questionHint: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  answerPreview: {
    marginTop: 12,
  },
  optionPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    marginBottom: 8,
  },
  correctOption: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  optionText: {
    fontSize: 14,
    color: '#1e293b',
    flex: 1,
  },
  buttonContainer: {
    padding: 16,
  },
  startButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});