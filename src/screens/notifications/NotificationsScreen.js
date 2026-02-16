import React from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import useNotifications from '../../hooks/useNotifications';

export default function NotificationsScreen() {
  const { notifications } = useNotifications();

  return (
    <FlatList
      data={notifications}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      renderItem={({ item }) => (
        <View style={[styles.card, !item.is_read && styles.unread]}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.message}>{item.message}</Text>
        </View>
      )}
      ListEmptyComponent={
        <Text style={styles.empty}>No notifications yet</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  unread: {
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  title: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  message: {
    marginTop: 4,
    color: '#64748b',
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: '#64748b',
  },
});
