import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useRefresh } from '../../contexts/RefreshContext';
import { logStudyHours } from '../../utils/studyTimeTracker';

// FIX #8: onLogComplete cannot be passed via RN navigation params (functions are stripped).
// Use RefreshContext.triggerRefresh() instead to notify the parent screen.
export default function LogStudyHoursScreen({ route, navigation }) {
  const { groupId } = route.params;
  const { user } = useAuth();
  const { triggerRefresh } = useRefresh();
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');

  const handleLog = async () => {
    const hrs = parseInt(hours) || 0;
    const mins = parseInt(minutes) || 0;
    const totalHours = hrs + mins / 60;

    if (totalHours <= 0) {
      Alert.alert('Error', 'Please enter a positive amount of study time');
      return;
    }

    const result = await logStudyHours(user.id, groupId, totalHours);

    if (result.success) {
      triggerRefresh();

      let message = `You logged ${hrs}h ${mins}m successfully!`;
      if (result.newAchievements.length > 0) {
        message += '\n\n🎉 You earned new achievements:\n';
        message += result.newAchievements.map(a => `${a.icon || '🏆'} ${a.name}`).join('\n');
      }

      Alert.alert('Success', message, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('Error', 'Failed to log hours');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Log your study time</Text>
      <View style={styles.timeInputs}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Hours</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={hours}
            onChangeText={setHours}
            placeholder="0"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Minutes</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={minutes}
            onChangeText={setMinutes}
            placeholder="0"
          />
        </View>
      </View>
      <TouchableOpacity style={styles.button} onPress={handleLog}>
        <MaterialCommunityIcons name="check" size={24} color="#fff" />
        <Text style={styles.buttonText}>Log Study Time</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f8fafc' },
  label: { fontSize: 18, color: '#1e293b', marginBottom: 24, fontWeight: '600' },
  timeInputs: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 14, color: '#64748b', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#94a3b8', borderRadius: 8, padding: 12, fontSize: 16 },
  button: {
    flexDirection: 'row', backgroundColor: '#6366f1', padding: 16,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});