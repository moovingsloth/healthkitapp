/**
 * HealthKitApp
 * React Native application with Apple HealthKit integration
 * Enhanced with Apple Watch connectivity and comprehensive health data
 * Now includes AI-powered focus prediction based on biometric data
 * 
 * @format
 */

import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import FocusScreen from './components/FocusScreen';

function App(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <FocusScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});

export default App;