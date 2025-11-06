import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { logger } from '../utils/logger';

export default function DebugScreen() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('');

  const refreshLogs = () => {
    setLogs(logger.getLogs().slice().reverse());
  };

  React.useEffect(() => {
    refreshLogs();
    const interval = setInterval(refreshLogs, 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(log => {
    if (!filter) return true;
    const searchTerm = filter.toLowerCase();
    return (
      log.message.toLowerCase().includes(searchTerm) ||
      log.level.toLowerCase().includes(searchTerm) ||
      (log.data && JSON.stringify(log.data).toLowerCase().includes(searchTerm))
    );
  });

  const getLogColor = (level) => {
    switch (level) {
      case 'ERROR': return '#FF4C4C';
      case 'WARN': return '#FFA500';
      case 'INFO': return '#007AFF';
      default: return '#666';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🐛 Debug Console</Text>
        <View style={styles.actions}>
          <Pressable style={styles.button} onPress={refreshLogs}>
            <Text style={styles.buttonText}>Refresh</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={() => { logger.clear(); refreshLogs(); }}>
            <Text style={styles.buttonText}>Clear</Text>
          </Pressable>
        </View>
      </View>

      <TextInput
        style={styles.filter}
        placeholder="Filter logs..."
        value={filter}
        onChangeText={setFilter}
        placeholderTextColor="#999"
      />

      <ScrollView style={styles.logsContainer}>
        {filteredLogs.length === 0 ? (
          <Text style={styles.empty}>No logs found</Text>
        ) : (
          filteredLogs.map((log, index) => (
            <View key={index} style={styles.logEntry}>
              <View style={styles.logHeader}>
                <Text style={[styles.logLevel, { color: getLogColor(log.level) }]}>
                  {log.level}
                </Text>
                <Text style={styles.logTime}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </Text>
              </View>
              <Text style={styles.logMessage}>{log.message}</Text>
              {log.data && (
                <Text style={styles.logData}>
                  {typeof log.data === 'object' ? JSON.stringify(log.data, null, 2) : String(log.data)}
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.stats}>
        <Text style={styles.statText}>
          Total: {logs.length} | Errors: {logs.filter(l => l.level === 'ERROR').length} | 
          Warnings: {logs.filter(l => l.level === 'WARN').length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  filter: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  logsContainer: {
    flex: 1,
    padding: 16,
  },
  logEntry: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#444',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logLevel: {
    fontSize: 12,
    fontWeight: '700',
  },
  logTime: {
    fontSize: 10,
    color: '#999',
  },
  logMessage: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  logData: {
    fontSize: 11,
    color: '#aaa',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  empty: {
    color: '#999',
    textAlign: 'center',
    marginTop: 40,
  },
  stats: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  statText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
});
