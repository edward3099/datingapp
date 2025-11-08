import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { logger } from '../utils/logger';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log to logger first
    try {
      logger.error('ErrorBoundary caught React error', {
        error: error?.toString() || 'Unknown error',
        message: error?.message,
        stack: error?.stack,
        componentStack: errorInfo?.componentStack,
        errorName: error?.name,
        errorInfo: errorInfo,
      });
    } catch (e) {
      // If logger fails, still log to console
      console.error('Failed to log to logger:', e);
    }

    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
    
    // Log to a more visible place
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('=== ERROR DETAILS ===');
      console.log('Error:', error);
      console.log('Error Stack:', error.stack);
      console.log('Component Stack:', errorInfo.componentStack);
      console.log('===================');
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
            <Text style={styles.title}>⚠️ Error Detected</Text>
            <Text style={styles.subtitle}>Something went wrong</Text>
            
            <View style={styles.errorBox}>
              <Text style={styles.errorLabel}>Error Message:</Text>
              <Text style={styles.errorText}>{this.state.error?.toString() || 'Unknown error'}</Text>
            </View>

            {this.state.error?.stack && (
              <View style={styles.errorBox}>
                <Text style={styles.errorLabel}>Stack Trace:</Text>
                <ScrollView style={styles.stackScroll}>
                  <Text style={styles.stackText}>{this.state.error.stack}</Text>
                </ScrollView>
              </View>
            )}

            {this.state.errorInfo?.componentStack && (
              <View style={styles.errorBox}>
                <Text style={styles.errorLabel}>Component Stack:</Text>
                <ScrollView style={styles.stackScroll}>
                  <Text style={styles.stackText}>{this.state.errorInfo.componentStack}</Text>
                </ScrollView>
              </View>
            )}

            <Pressable style={styles.button} onPress={this.handleReset}>
              <Text style={styles.buttonText}>Try Again</Text>
            </Pressable>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE6EE',
    paddingTop: 60,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FF4C4C',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FF4C4C',
  },
  errorLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF4C4C',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'monospace',
  },
  stackScroll: {
    maxHeight: 200,
  },
  stackText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default ErrorBoundary;
