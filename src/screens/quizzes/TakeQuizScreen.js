import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';

export default function TakeQuizScreen({ route, navigation }) {
  const { quizId } = route.params;
  const { user } = useAuth();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);

  // Use ref to avoid stale closure in timer callback
  const answersRef = useRef({});
  const questionsRef = useRef([]);
  const submitCalledRef = useRef(false);

  useEffect(() => {
    fetchQuiz();
  }, []);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  useEffect(() => {
    if (quiz?.time_limit && timeLeft === null) {
      setTimeLeft(quiz.time_limit * 60);
    }
  }, [quiz]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Call via ref to avoid stale closure
          if (!submitCalledRef.current) {
            submitCalledRef.current = true;
            saveQuizAttempt(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft === null ? null : 'running']);

  const fetchQuiz = async () => {
    try {
      const { data: quizData } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      setQuiz(quizData);

      const { data: questionsData } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index', { ascending: true });

      setQuestions(questionsData || []);
      questionsRef.current = questionsData || [];
      setLoading(false);
    } catch (error) {
      console.error('Error fetching quiz:', error);
      Alert.alert('Error', 'Failed to load quiz');
      navigation.goBack();
    }
  };

  const selectAnswer = (questionId, answerIndex) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answerIndex }));
  };

  const calculateScore = (currentAnswers, currentQuestions) => {
    let score = 0;
    let totalPoints = 0;
    currentQuestions.forEach((question) => {
      totalPoints += question.points || 10;
      if (currentAnswers[question.id] === question.correct_answer) {
        score += question.points || 10;
      }
    });
    return { score, totalPoints };
  };

  const submitQuiz = () => {
    const answeredCount = Object.keys(answersRef.current).length;
    if (answeredCount < questionsRef.current.length) {
      Alert.alert(
        'Incomplete Quiz',
        `You have answered ${answeredCount} out of ${questionsRef.current.length} questions. Submit anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Submit',
            onPress: () => {
              submitCalledRef.current = true;
              saveQuizAttempt(false);
            },
          },
        ]
      );
      return;
    }
    submitCalledRef.current = true;
    saveQuizAttempt(false);
  };

  const saveQuizAttempt = async (isAutoSubmit) => {
    try {
      const currentAnswers = answersRef.current;
      const currentQuestions = questionsRef.current;
      const { score, totalPoints } = calculateScore(currentAnswers, currentQuestions);

      const { data: attemptData, error: attemptError } = await supabase
        .from('quiz_attempts')
        .insert({
          quiz_id: quizId,
          user_id: user.id,
          score,
          total_points: totalPoints,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (attemptError) throw attemptError;

      const answerRecords = currentQuestions.map((question) => ({
        attempt_id: attemptData.id,
        question_id: question.id,
        selected_answer: currentAnswers[question.id] ?? null,
        is_correct: currentAnswers[question.id] === question.correct_answer,
      }));

      const { error: answersError } = await supabase
        .from('quiz_answers')
        .insert(answerRecords);

      if (answersError) throw answersError;

      const percentage = Math.round((score / totalPoints) * 100);
      Alert.alert(
        isAutoSubmit ? 'Time Up!' : 'Quiz Completed!',
        `You scored ${score} out of ${totalPoints} points (${percentage}%)`,
        [
          {
            text: 'View Results',
            onPress: () => {
              navigation.replace('QuizDetail', { quizId, attemptId: attemptData.id });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting quiz:', error);
      Alert.alert('Error', 'Failed to submit quiz. Please try again.');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading quiz...</Text>
      </View>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.questionCounter}>
              Question {currentQuestionIndex + 1} of {questions.length}
            </Text>
            {timeLeft !== null && (
              <View style={styles.timerContainer}>
                <MaterialCommunityIcons name="clock-outline" size={16} color="#fff" />
                <Text style={[styles.timerText, timeLeft < 60 && styles.timerWarning]}>
                  {formatTime(timeLeft)}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.pointsText}>{currentQuestion?.points || 10} pts</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>{currentQuestion?.question}</Text>
        </View>
        <View style={styles.optionsContainer}>
          {currentQuestion?.options?.map((option, index) => {
            const isSelected = answers[currentQuestion.id] === index;
            return (
              <TouchableOpacity
                key={index}
                style={[styles.optionButton, isSelected && styles.optionSelected]}
                onPress={() => selectAnswer(currentQuestion.id, index)}
              >
                <View style={[styles.optionIndicator, isSelected && styles.indicatorSelected]}>
                  {isSelected && <View style={styles.indicatorDot} />}
                </View>
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.navButton, currentQuestionIndex === 0 && styles.navButtonDisabled]}
          onPress={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
          disabled={currentQuestionIndex === 0}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={24}
            color={currentQuestionIndex === 0 ? '#cbd5e1' : '#6366f1'}
          />
          <Text
            style={[
              styles.navButtonText,
              currentQuestionIndex === 0 && styles.navButtonTextDisabled,
            ]}
          >
            Previous
          </Text>
        </TouchableOpacity>

        {currentQuestionIndex === questions.length - 1 ? (
          <TouchableOpacity style={styles.submitButton} onPress={submitQuiz}>
            <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.submitButtonGradient}>
              <Text style={styles.submitButtonText}>Submit Quiz</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
          >
            <Text style={styles.navButtonText}>Next</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#6366f1" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingTop: 16 },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  questionCounter: { fontSize: 14, color: '#e0e7ff', marginBottom: 4 },
  timerContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timerText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  timerWarning: { color: '#fca5a5' },
  pointsText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#fff' },
  content: { flex: 1, padding: 20 },
  questionContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  questionText: { fontSize: 18, color: '#1e293b', lineHeight: 28, fontWeight: '500' },
  optionsContainer: { gap: 12 },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  optionSelected: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  optionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicatorSelected: { borderColor: '#6366f1' },
  indicatorDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#6366f1' },
  optionText: { flex: 1, fontSize: 16, color: '#475569' },
  optionTextSelected: { color: '#1e293b', fontWeight: '500' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 4,
  },
  navButtonDisabled: { opacity: 0.4 },
  navButtonText: { fontSize: 16, fontWeight: '600', color: '#6366f1' },
  navButtonTextDisabled: { color: '#cbd5e1' },
  submitButton: { borderRadius: 12, overflow: 'hidden' },
  submitButtonGradient: { paddingVertical: 12, paddingHorizontal: 32 },
  submitButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
});