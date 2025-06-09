/**
 * HealthKitApp
 * React Native application with Apple HealthKit integration
 * Enhanced with Apple Watch connectivity and comprehensive health data
 * Now includes AI-powered focus prediction based on biometric data
 * 
 * @format
 */

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import Dashboard from './components/Dashboard';
import FocusScreen from './components/FocusScreen';
import { initHealthKit } from './services/HealthKitService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Stack = createStackNavigator();

function App() {
  const [initializing, setInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  
  // 앱 시작 시 HealthKit 초기화 및 데이터 동기화
  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 앱 초기화 시작...');
      
      try {
        // 사용자 ID 가져오기 (실제 앱에서는 로그인 시스템 구현)
        let userId = await AsyncStorage.getItem('userId');
        
        // 저장된 ID가 없으면 기본값 설정
        if (!userId) {
          userId = 'user123'; // 개발용 ID
          await AsyncStorage.setItem('userId', userId);
          console.log(`👤 새로운 사용자 ID 생성: ${userId}`);
        } else {
          console.log(`👤 저장된 사용자 ID 로드: ${userId}`);
        }
        
        // 마지막 동기화 시간 확인
        const lastSync = await AsyncStorage.getItem('lastHealthDataSync');
        const now = new Date().toISOString();
        
        if (!lastSync || isOlderThanHours(lastSync, 6)) {
          console.log(`🔄 마지막 동기화: ${lastSync || '없음'}`);
          console.log('⏱️ 동기화가 필요합니다.');
          
          // HealthKit 초기화 및 데이터 동기화
          initHealthKit(userId);
          
          // 동기화 시간 업데이트
          await AsyncStorage.setItem('lastHealthDataSync', now);
          console.log(`✅ 동기화 시간 업데이트: ${now}`);
        } else {
          console.log(`⏱️ 최근에 동기화되었습니다 (${lastSync}). 동기화 건너뜀`);
        }
      } catch (error) {
        console.error('❌ 앱 초기화 중 오류:', error);
        setInitError('앱 초기화 중 문제가 발생했습니다.');
      } finally {
        // 3초 후 로딩 화면 종료 (데이터 동기화는 백그라운드에서 계속됨)
        setTimeout(() => {
          setInitializing(false);
        }, 3000);
      }
    };
    
    initializeApp();
  }, []);
  
  // 마지막 동기화가 지정된 시간(시간 단위)보다 오래되었는지 확인
  const isOlderThanHours = (dateString: string, hours: number): boolean => {
    const lastDate = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - lastDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours > hours;
  };
  
  // 앱 초기화 중 로딩 화면 표시
  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>FocusTrack 초기화 중...</Text>
        <Text style={styles.subText}>HealthKit 데이터 동기화 중입니다</Text>
        {initError && <Text style={styles.errorText}>{initError}</Text>}
      </View>
    );
  }
  
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Dashboard">
        <Stack.Screen 
          name="Dashboard" 
          component={Dashboard}
          options={{ 
            title: '집중력 대시보드',
            headerTitleAlign: 'center',
          }}
        />
        <Stack.Screen 
          name="Focus" 
          component={FocusScreen} 
          options={{ 
            title: 'AI 집중력 분석',
            headerTitleAlign: 'center',
          }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  loadingText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    color: '#0000ff',
  },
  subText: {
    fontSize: 16,
    marginTop: 10,
    color: '#555',
  },
  errorText: {
    fontSize: 14,
    marginTop: 20,
    color: 'red',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default App;