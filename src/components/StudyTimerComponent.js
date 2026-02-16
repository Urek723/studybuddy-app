// Updated StudyTimerComponent with timer state callbacks
// Location: src/components/StudyTimerComponent.js

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import {
  startStudySession,
  endStudySession,
  getTotalStudyHours,
} from '../utils/studyTimeTracker';

export default function StudyTimerComponent({ 
  groupId, 
  navigation,
  onTimerStart,  // ✅ New prop
  onTimerStop,   // ✅ New prop
  onAchievementsUpdate 
}) {
  const { user } = useAuth();
  const [isStudying, setIsStudying] = useState(false);
  const [session, setSession] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalHours, setTotalHours] = useState(0);

  useEffect(() => {
    fetchTotalHours();
  }, []);

  // Timer effect
  useEffect(() => {
    let interval;
    if (isStudying) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStudying]);

  const fetchTotalHours = async () => {
    const total = await getTotalStudyHours(user.id, groupId);
    setTotalHours(total);
  };

  const handleStartStudy = () => {
    const newSession = startStudySession(user.id, groupId);
    setSession(newSession);
    setIsStudying(true);
    setElapsedTime(0);
    
    // ✅ Notify parent that timer started
    if (onTimerStart) {
      onTimerStart();
    }
  };

  const handleEndStudy = async () => {
    if (!session) return;

    setIsStudying(false);
    
    const result = await endStudySession(session);
    
    if (result.success) {
      Alert.alert(
        '🎉 Great Work!',
        `You studied for ${result.hours} hours!\n\nKeep up the excellent work!`,
        [{ text: 'OK' }]
      );
      
      setSession(null);
      setElapsedTime(0);
      await fetchTotalHours();
      
      // Update achievements
      if (onAchievementsUpdate) {
        onAchievementsUpdate();
      }
    } else {
      Alert.alert('Error', 'Failed to save study session');
    }
    
    // ✅ Notify parent that timer stopped
    if (onTimerStop) {
      onTimerStop();
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Total Hours Display */}
      <View style={styles.totalCard}>
        <MaterialCommunityIcons name="clock-outline" size={24} color="#6366f1" />
        <View style={styles.totalInfo}>
          <Text style={styles.totalLabel}>Total Study Time</Text>
          <Text style={styles.totalValue}>{totalHours} hours</Text>
        </View>
      </View>

      {/* Timer Display */}
      {isStudying && (
        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>Current Session</Text>
          <Text style={styles.timerValue}>{formatTime(elapsedTime)}</Text>
          <View style={styles.pulseContainer}>
            <View style={styles.pulse} />
            <MaterialCommunityIcons name="circle" size={12} color="#22c55e" />
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {!isStudying ? (
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartStudy}
          >
            <MaterialCommunityIcons name="play" size={24} color="#fff" />
            <Text style={styles.buttonText}>Start Studying</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.stopButton}
            onPress={handleEndStudy}
          >
            <MaterialCommunityIcons name="stop" size={24} color="#fff" />
            <Text style={styles.buttonText}>End Session</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  totalInfo: {
    marginLeft: 12,
  },
  totalLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  timerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#22c55e',
    position: 'relative',
  },
  timerLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  timerValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#22c55e',
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  pulseContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#22c55e',
    opacity: 0.3,
  },
  buttonContainer: {
    gap: 12,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});