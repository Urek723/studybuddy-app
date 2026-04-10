import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';

export default function CreateQuizScreen({ navigation }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [timeLimit, setTimeLimit] = useState('');
  const [questions, setQuestions] = useState([
    {
      question: '',
      options: ['', '', '', ''],
      correct_answer: 0,
      points: 10,
    },
  ]);
  const [userGroups, setUserGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUserGroups();
  }, []);

  const fetchUserGroups = async () => {
    try {
      const { data } = await supabase
        .from('group_members')
        .select('*, study_groups (id, name)')
        .eq('user_id', user.id)
        .eq('status', 'accepted'); // FIX #15: only show groups user actually belongs to

      setUserGroups(data?.map(gm => gm.study_groups).filter(Boolean) || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question: '',
        options: ['', '', '', ''],
        correct_answer: 0,
        points: 10,
      },
    ]);
  };

  const removeQuestion = (index) => {
    if (questions.length === 1) {
      Alert.alert('Error', 'Quiz must have at least one question');
      return;
    }
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
  };

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options[optionIndex] = value;
    setQuestions(newQuestions);
  };

  const validateQuiz = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a quiz title');
      return false;
    }

    if (!selectedGroup) {
      Alert.alert('Error', 'Please select a group');
      return false;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        Alert.alert('Error', `Question ${i + 1} is empty`);
        return false;
      }

      const emptyOptions = q.options.filter(opt => !opt.trim());
      if (emptyOptions.length > 0) {
        Alert.alert('Error', `Question ${i + 1} has empty options`);
        return false;
      }
    }

    return true;
  };

  const createQuiz = async () => {
    if (!validateQuiz()) return;

    setLoading(true);

    try {
      // Create quiz
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          group_id: selectedGroup,
          title: title.trim(),
          description: description.trim(),
          time_limit: timeLimit ? parseInt(timeLimit) : null,
          created_by: user.id,
        })
        .select()
        .single();

      if (quizError) throw quizError;

      // Create questions
      const questionRecords = questions.map((q, index) => ({
        quiz_id: quizData.id,
        question: q.question.trim(),
        options: q.options,
        correct_answer: q.correct_answer,
        points: q.points,
        order_index: index,
      }));

      const { error: questionsError } = await supabase
        .from('quiz_questions')
        .insert(questionRecords);

      if (questionsError) throw questionsError;

      Alert.alert('Success', 'Quiz created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            navigation.replace('QuizDetail', { quizId: quizData.id });
          },
        },
      ]);
    } catch (error) {
      console.error('Error creating quiz:', error);
      Alert.alert('Error', 'Failed to create quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <MaterialCommunityIcons name="brain" size={48} color="#fff" />
        <Text style={styles.headerTitle}>Create Quiz</Text>
        <Text style={styles.headerSubtitle}>Test your group's knowledge</Text>
      </LinearGradient>

      <View style={styles.formContainer}>
        {/* Quiz Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Quiz Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Data Structures Midterm Practice"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Optional description..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* Select Group */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Select Group *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.groupChips}>
              {userGroups.map((group) => (
                <TouchableOpacity
                  key={group.id}
                  style={[
                    styles.groupChip,
                    selectedGroup === group.id && styles.groupChipSelected,
                  ]}
                  onPress={() => setSelectedGroup(group.id)}
                >
                  <Text
                    style={[
                      styles.groupChipText,
                      selectedGroup === group.id && styles.groupChipTextSelected,
                    ]}
                  >
                    {group.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Time Limit */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Time Limit (minutes, optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 30"
            value={timeLimit}
            onChangeText={setTimeLimit}
            keyboardType="number-pad"
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* Questions */}
        <View style={styles.questionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Questions ({questions.length})</Text>
            <TouchableOpacity style={styles.addButton} onPress={addQuestion}>
              <MaterialCommunityIcons name="plus" size={20} color="#6366f1" />
            </TouchableOpacity>
          </View>

          {questions.map((question, qIndex) => (
            <View key={qIndex} style={styles.questionCard}>
              <View style={styles.questionHeader}>
                <Text style={styles.questionNumber}>Question {qIndex + 1}</Text>
                {questions.length > 1 && (
                  <TouchableOpacity onPress={() => removeQuestion(qIndex)}>
                    <MaterialCommunityIcons name="delete" size={20} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                style={[styles.input, styles.questionInput]}
                placeholder="Enter your question..."
                value={question.question}
                onChangeText={(text) => updateQuestion(qIndex, 'question', text)}
                multiline
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.optionsLabel}>Options:</Text>
              {question.options.map((option, oIndex) => (
                <View key={oIndex} style={styles.optionRow}>
                  <TouchableOpacity
                    style={[
                      styles.correctIndicator,
                      question.correct_answer === oIndex && styles.correctIndicatorSelected,
                    ]}
                    onPress={() => updateQuestion(qIndex, 'correct_answer', oIndex)}
                  >
                    {question.correct_answer === oIndex && (
                      <MaterialCommunityIcons name="check" size={14} color="#fff" />
                    )}
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.input, styles.optionInput]}
                    placeholder={`Option ${oIndex + 1}`}
                    value={option}
                    onChangeText={(text) => updateOption(qIndex, oIndex, text)}
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              ))}

              <Text style={styles.hint}>
                Tap the circle to mark the correct answer
              </Text>
            </View>
          ))}
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={createQuiz}
          disabled={loading}
        >
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            style={styles.createButtonGradient}
          >
            <MaterialCommunityIcons name="check-circle" size={24} color="#fff" />
            <Text style={styles.createButtonText}>
              {loading ? 'Creating...' : 'Create Quiz'}
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
  header: {
    padding: 32,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0e7ff',
    marginTop: 4,
  },
  formContainer: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  groupChips: {
    flexDirection: 'row',
    gap: 8,
  },
  groupChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  groupChipSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  groupChipText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  groupChipTextSelected: {
    color: '#fff',
  },
  questionsSection: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  questionInput: {
    marginBottom: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  correctIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  correctIndicatorSelected: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  optionInput: {
    flex: 1,
  },
  hint: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 8,
  },
  createButton: {
    marginTop: 8,
    marginBottom: 32,
    borderRadius: 12,
    overflow: 'hidden',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});