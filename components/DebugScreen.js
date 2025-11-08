import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { logger } from '../utils/logger';
import { exportLogsToFile, printErrorsToConsole, getLogsSummary, formatErrorsForCopy } from '../utils/exportLogs';

export default function DebugScreen() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('');
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const [showWarnings, setShowWarnings] = useState(true);

  const refreshLogs = () => {
    setLogs(logger.getLogs().slice().reverse());
  };

  React.useEffect(() => {
    refreshLogs();
    const interval = setInterval(refreshLogs, 1000);
    
    // Show summary on mount
    const summary = getLogsSummary();
    if (summary.errors > 0) {
      console.log(`⚠️ Debug Screen: ${summary.errors} error(s) captured`);
    }
    
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(log => {
    // Filter by errors only if enabled
    if (showErrorsOnly && log.level !== 'ERROR') {
      return false;
    }
    
    // Filter warnings if disabled
    if (!showWarnings && log.level === 'WARN') {
      return false;
    }
    
    // Filter by search term
    if (!filter) return true;
    const searchTerm = filter.toLowerCase();
    return (
      log.message.toLowerCase().includes(searchTerm) ||
      log.level.toLowerCase().includes(searchTerm) ||
      (log.data && JSON.stringify(log.data).toLowerCase().includes(searchTerm))
    );
  });

  const errorCount = logs.filter(l => l.level === 'ERROR').length;
  const warningCount = logs.filter(l => l.level === 'WARN').length;

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
          <Pressable 
            style={[styles.button, showErrorsOnly && styles.buttonActive]} 
            onPress={() => setShowErrorsOnly(!showErrorsOnly)}
          >
            <Text style={styles.buttonText}>
              Errors Only {errorCount > 0 && `(${errorCount})`}
            </Text>
          </Pressable>
          <Pressable 
            style={[styles.button, !showWarnings && styles.buttonActive]} 
            onPress={() => setShowWarnings(!showWarnings)}
          >
            <Text style={styles.buttonText}>
              {showWarnings ? 'Hide Warnings' : 'Show Warnings'} {warningCount > 0 && `(${warningCount})`}
            </Text>
          </Pressable>
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
            <View key={index} style={[
              styles.logEntry, 
              log.level === 'ERROR' && styles.errorEntry,
              log.level === 'WARN' && styles.warningEntry
            ]}>
              <View style={styles.logHeader}>
                <Text style={[styles.logLevel, { color: getLogColor(log.level) }]}>
                  {log.level}
                  {log.data?._isReactWarning && ' [React]'}
                  {log.data?._isInfoWarning && ' [Info]'}
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
          Total: {logs.length} | Errors: {errorCount} | Warnings: {warningCount}
        </Text>
        {errorCount > 0 && (
          <Text style={styles.errorAlert}>
            ⚠️ {errorCount} error(s) captured! Click "Copy All Errors" to copy detailed error report.
          </Text>
        )}
        <View style={styles.actionButtons}>
          {errorCount > 0 && (
            <>
              <Pressable 
                style={styles.copyButton}
                onPress={async () => {
                  try {
                    const errorText = formatErrorsForCopy();
                    // Use the correct expo-clipboard API
                    if (Clipboard && Clipboard.setStringAsync) {
                      await Clipboard.setStringAsync(errorText);
                    } else if (Clipboard && Clipboard.setString) {
                      await Clipboard.setString(errorText);
                    } else {
                      // Fallback: log to console
                      console.log('=== ERROR REPORT (Copy manually) ===');
                      console.log(errorText);
                      console.log('=== END ERROR REPORT ===');
                      Alert.alert('Clipboard Not Available', 'Error report printed to console. Check your debugger.');
                      return;
                    }
                    Alert.alert('✅ Copied!', 'All error details copied to clipboard. You can now paste it anywhere.');
                  } catch (error) {
                    console.log('Copy error:', error);
                    // Fallback to console
                    const errorText = formatErrorsForCopy();
                    console.log('=== ERROR REPORT (Copy manually) ===');
                    console.log(errorText);
                    console.log('=== END ERROR REPORT ===');
                    Alert.alert('Copy Failed', 'Error report printed to console. Check your debugger.');
                  }
                }}
              >
                <Text style={styles.copyButtonText}>📋 Copy All Errors</Text>
              </Pressable>
              <Pressable 
                style={styles.errorButton}
                onPress={() => {
                  printErrorsToConsole();
                  Alert.alert('Errors Printed', 'Check your console/debugger for detailed error information');
                }}
              >
                <Text style={styles.errorButtonText}>🔍 Print to Console</Text>
              </Pressable>
            </>
          )}
          <Pressable 
            style={styles.exportButton}
            onPress={async () => {
              const result = await exportLogsToFile();
              if (result.success) {
                Alert.alert('Logs Exported', `Logs saved to: ${result.fileName || 'console'}`);
              } else {
                Alert.alert('Export Failed', result.error || 'Could not export logs');
              }
            }}
          >
            <Text style={styles.exportButtonText}>💾 Export All Logs</Text>
          </Pressable>
        </View>
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
  buttonActive: {
    backgroundColor: '#FF4C4C',
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
  errorEntry: {
    borderLeftColor: '#FF4C4C',
    backgroundColor: '#3a1a1a',
  },
  warningEntry: {
    borderLeftColor: '#FFA500',
    backgroundColor: '#3a2a1a',
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
    marginBottom: 8,
  },
  copyButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'center',
    minWidth: 160,
  },
  copyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  errorButton: {
    backgroundColor: '#FF4C4C',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'center',
  },
  errorButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  exportButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'center',
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  errorAlert: {
    color: '#FF4C4C',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(255, 76, 76, 0.1)',
    borderRadius: 6,
  },
});
