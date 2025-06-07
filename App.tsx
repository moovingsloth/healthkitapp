/**
 * HealthKitApp
 * React Native application with Apple HealthKit integration
 * Enhanced with Apple Watch connectivity and comprehensive health data
 * Now includes AI-powered focus prediction based on biometric data
 * 
 * @format
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Dashboard from './components/Dashboard';
import FocusScreen from './components/FocusScreen';

const Stack = createStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Dashboard" >
        {/* <Stack.Screen name="Dashboard" component={Dashboard} options={{ title: 'FocusTrack 대시보드' }} /> */}
        <Stack.Screen name="Dashboard" component={Dashboard}           options={{ 
            title: '집중력 대시보드',
            headerTitleAlign: 'center', // 제목 중앙 정렬
          }}  />
        <Stack.Screen name="Focus" component={FocusScreen} options={{ 
            title: 'AI 집중력 분석',
            headerTitleAlign: 'center', // 제목 중앙 정렬
          }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;