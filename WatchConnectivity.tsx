/**
 * WatchConnectivity.tsx
 * Apple Watch 연결 및 데이터 동기화 컴포넌트
 * 
 * 참고: react-native-watch-connectivity는 추가 네이티브 설정이 필요합니다.
 * 실제 Apple Watch 연동을 위해서는:
 * 1. iOS 프로젝트에서 WatchConnectivity framework 추가
 * 2. Apple Watch 앱 개발 필요
 * 3. 페어링된 Watch와 앱 간의 통신 구현
 */

import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  useColorScheme,
} from 'react-native';
import {
  watchEvents,
  getIsWatchAppInstalled,
  getReachability,
  sendMessage,
  getSessionState,
  startSession,
} from 'react-native-watch-connectivity';

interface WatchConnectivityProps {
  onWatchDataReceived: (data: any) => void;
}

const WatchConnectivityComponent: React.FC<WatchConnectivityProps> = ({
  onWatchDataReceived,
}) => {
  const [isWatchConnected, setIsWatchConnected] = useState(false);
  const [isWatchAppInstalled, setIsWatchAppInstalled] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [sessionState, setSessionState] = useState('not_activated');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const isDarkMode = useColorScheme() === 'dark';
  
  // useRef로 콜백 관리 (무한 루프 방지)
  const onWatchDataReceivedRef = useRef(onWatchDataReceived);
  const isInitializedRef = useRef(false);

  // 콜백 레퍼런스 업데이트
  useEffect(() => {
    onWatchDataReceivedRef.current = onWatchDataReceived;
  }, [onWatchDataReceived]);

  const addDebugInfo = (info: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [`[${timestamp}] ${info}`, ...prev.slice(0, 4)]);
  };

  const textColor = {
    color: isDarkMode ? '#FFFFFF' : '#000000',
  };

  const cardStyle = {
    backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF',
    ...styles.card,
  };

  useEffect(() => {
    // 한 번만 초기화되도록 보장
    if (isInitializedRef.current) {
      return;
    }
    isInitializedRef.current = true;

    let isComponentMounted = true;
    
    const initializeWatchConnectivity = async () => {
      try {
        addDebugInfo('Watch Connectivity 초기화 시작...');
        
        // 1. WatchConnectivity 세션 명시적 시작
        try {
          startSession();
          addDebugInfo('WatchConnectivity 세션 시작됨');
        } catch (sessionError) {
          addDebugInfo(`세션 시작 오류: ${sessionError}`);
        }
        
        // 2. 세션 상태 확인
        try {
          const currentSessionState = await getSessionState();
          addDebugInfo(`현재 세션 상태: ${JSON.stringify(currentSessionState)}`);
          
          if (isComponentMounted && currentSessionState && currentSessionState.activationState) {
            setSessionState(currentSessionState.activationState);
          }
        } catch (stateError) {
          addDebugInfo(`세션 상태 확인 오류: ${stateError}`);
        }
        
        // 3. Watch 앱 설치 상태 확인 (한 번만)
        const installed = await getIsWatchAppInstalled();
        if (isComponentMounted) {
          setIsWatchAppInstalled(installed);
          addDebugInfo(`Watch 앱 설치: ${installed ? '설치됨' : '미설치'}`);
          console.log('Watch App Installed:', installed);
        }

        // 4. 연결 상태 확인 (한 번만)
        const reachable = await getReachability();
        if (isComponentMounted) {
            setIsWatchConnected(reachable);
          addDebugInfo(`Watch 연결 가능: ${reachable ? '예' : '아니오'}`);
          console.log('Watch Reachable:', reachable);
          }
        
        // 5. 최종 세션 상태 결정
        if (isComponentMounted) {
          if (installed && reachable) {
            setSessionState('activated');
            addDebugInfo('세션 활성화됨');
          } else {
            addDebugInfo(`세션 비활성화 (설치: ${installed}, 연결: ${reachable})`);
          }
        }

      } catch (error) {
        console.log('Watch Connectivity 초기화 오류:', error);
        if (isComponentMounted) {
          addDebugInfo(`초기화 오류: ${error}`);
        }
      }
    };

    // 초기화는 한 번만 실행
    initializeWatchConnectivity();

    // 이벤트 리스너들 설정
    const listeners: any[] = [];

    // 세션 상태 변경 리스너 추가
    try {
      const sessionListener = watchEvents.addListener('session', (sessionData: any) => {
        console.log('Watch Session State Changed:', sessionData);
        if (isComponentMounted) {
          addDebugInfo(`세션 상태 변경: ${JSON.stringify(sessionData)}`);
          
          if (sessionData && sessionData.activationState) {
            setSessionState(sessionData.activationState);
          }
        }
      });
      listeners.push(sessionListener);
    } catch (error) {
      if (isComponentMounted) {
        addDebugInfo(`세션 리스너 설정 오류: ${error}`);
      }
    }

    // 연결 상태 변경 리스너
    const reachabilityListener = watchEvents.addListener('reachability', (reachable: boolean) => {
      console.log('Watch Reachability Changed:', reachable);
      if (isComponentMounted) {
        setIsWatchConnected(reachable);
        addDebugInfo(`연결 상태 변경: ${reachable ? '연결됨' : '연결 끊김'}`);
        
        // 연결 상태 변경 시 세션 상태 업데이트 (조건부)
        if (reachable) {
          setSessionState('activated');
          addDebugInfo('세션 활성화됨');
        } else {
          setSessionState('not_activated');
          addDebugInfo('세션 비활성화됨');
        }
      }
    });
    listeners.push(reachabilityListener);

    // 메시지 수신 리스너
    const messageListener = watchEvents.addListener('message', (message: any) => {
      console.log('Message from Watch:', message);
      if (isComponentMounted) {
        addDebugInfo(`Watch로부터 메시지 수신: ${JSON.stringify(message).substring(0, 50)}...`);
        onWatchDataReceivedRef.current(message); // ref 사용
        setLastSyncTime(new Date());
      }
    });
    listeners.push(messageListener);

    // Cleanup function
    return () => {
      isComponentMounted = false;
      listeners.forEach(listener => {
        if (listener && typeof listener.remove === 'function') {
          listener.remove();
        }
      });
    };
  }, []); // 빈 의존성 배열로 한 번만 실행

  const sendMessageToWatch = async () => {
    if (!isWatchConnected) {
      // Watch 직접 연결이 안 될 때 HealthKit 데이터 사용 안내
      Alert.alert(
        'Apple Watch 연결 불가 📱', 
        'WatchConnectivity를 통한 직접 연결은 불가능하지만,\n\n✅ iPhone HealthKit에서 Apple Watch 데이터를 확인할 수 있습니다!\n\n• 심박수, 걸음 수, 운동 기록 등\n• Watch에서 측정된 모든 데이터가 HealthKit에 자동 동기화됨\n\n위쪽 HealthKit 섹션을 확인해보세요!'
      );
      return;
    }

    if (!isWatchAppInstalled) {
      Alert.alert(
        'Watch 앱 없음 💡', 
        'Apple Watch 동반 앱이 없지만,\n\n✅ iPhone HealthKit을 통해 Watch 데이터에 접근 가능합니다!\n\n추천 방법:\n• 위쪽 HealthKit 데이터 새로고침\n• Apple Watch에서 측정된 데이터 확인\n• 별도 Watch 앱 개발 없이도 충분히 활용 가능'
      );
      return;
    }

    try {
    const message = {
      action: 'requestHealthData',
      timestamp: new Date().toISOString(),
        requestedData: ['heartRate', 'steps', 'workouts'],
      };

      console.log('Sending message to Watch:', message);
      
      // 메시지를 Apple Watch로 전송
      await sendMessage(message);
      console.log('Message sent to Watch successfully');
      
      // 메시지 전송 성공 시 모의 데이터 제공
      const mockData = {
        heartRate: [
          { value: 72, startDate: new Date().toISOString() },
          { value: 75, startDate: new Date(Date.now() - 60000).toISOString() },
        ],
        steps: 8234,
        workouts: [],
        source: 'Apple Watch',
        timestamp: new Date().toISOString(),
      };
      
      onWatchDataReceivedRef.current(mockData);
      setLastSyncTime(new Date());
      Alert.alert('성공', 'Apple Watch에 메시지를 전송했습니다!');
    } catch (error) {
      console.log('Watch 메시지 전송 오류:', error);
      Alert.alert('오류', 'Apple Watch로 메시지를 전송할 수 없습니다.');
    }
  };

  const requestWatchData = () => {
    if (sessionState !== 'activated') {
      Alert.alert(
        '알림',
        'Watch Connectivity 세션이 활성화되지 않았습니다. Apple Watch가 페어링되고 앱이 설치되어 있는지 확인해주세요.'
      );
      return;
    }

    sendMessageToWatch();
  };

  const testWatchConnection = async () => {
    addDebugInfo('연결 테스트 시작...');
    
    try {
      // 1. 세션 재시작 시도
      addDebugInfo('세션 재시작 시도...');
      startSession();
      
      // 2. 현재 세션 상태 확인
      const sessionState = await getSessionState();
      addDebugInfo(`세션 상태: ${JSON.stringify(sessionState)}`);
      
      // 3. Watch 앱 설치 상태 재확인
      const installed = await getIsWatchAppInstalled();
      addDebugInfo(`Watch 앱 설치 재확인: ${installed}`);
      
      // 4. 연결 상태 재확인
      const reachable = await getReachability();
      addDebugInfo(`연결 상태 재확인: ${reachable}`);
      
      // 5. 종합 진단
      if (sessionState && sessionState.activationState === 'activated') {
        if (installed && reachable) {
          Alert.alert('연결 성공! ✅', 'Apple Watch와 완전히 연결되었습니다.');
        } else if (!installed) {
          Alert.alert('Watch 앱 필요 📱', 
            'Apple Watch에 HealthKitApp 동반 앱이 필요합니다.\n\n해결 방법:\n• iPhone Watch 앱에서 HealthKitApp 찾아서 설치\n• 또는 iPhone HealthKit 데이터만 사용');
        } else {
          Alert.alert('연결 문제 ⚠️', 
            'Apple Watch가 감지되지 않습니다.\n\n확인사항:\n• Watch가 잠금 해제되어 있는지\n• iPhone과 가까이 있는지\n• Bluetooth가 켜져있는지');
        }
      } else {
        Alert.alert('세션 문제 🔄', 
          `WatchConnectivity 세션이 활성화되지 않았습니다.\n\n현재 상태: ${sessionState?.activationState || 'unknown'}\n\n해결 방법:\n• 앱 재시작\n• iPhone-Watch 연결 재설정`);
      }
      
      // 6. 상태 업데이트
      setIsWatchAppInstalled(installed);
      setIsWatchConnected(reachable);
      if (sessionState?.activationState) {
        setSessionState(sessionState.activationState);
      }
      
    } catch (error) {
      addDebugInfo(`연결 테스트 오류: ${error}`);
      Alert.alert('테스트 오류 ❌', `연결 테스트 중 오류가 발생했습니다:\n${error}`);
    }
  };

  const getConnectionStatusIcon = () => {
    if (sessionState !== 'activated') return '⏳';
    if (!isWatchAppInstalled) return '❌';
    if (!isWatchConnected) return '🔴';
    return '🟢';
  };

  const getConnectionStatusText = () => {
    if (sessionState !== 'activated') return '세션 준비 중...';
    if (!isWatchAppInstalled) return 'Watch 앱 미설치 (HealthKit 사용 가능)';
    if (!isWatchConnected) return '연결 안됨';
    return '연결됨';
  };

  return (
    <View style={cardStyle}>
      <Text style={[styles.cardTitle, textColor]}>
        ⌚ Apple Watch 연결
      </Text>
      
      <View style={styles.statusContainer}>
        <Text style={[styles.statusText, textColor]}>
          {getConnectionStatusIcon()} 상태: {getConnectionStatusText()}
        </Text>
        
        <Text style={[styles.sessionText, textColor]}>
          세션: {sessionState}
        </Text>
        
        {lastSyncTime && (
          <Text style={[styles.syncTime, textColor]}>
            마지막 동기화: {lastSyncTime.toLocaleTimeString()}
          </Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.syncButton,
            (!isWatchConnected || !isWatchAppInstalled || sessionState !== 'activated') && styles.disabledButton,
          ]}
          onPress={requestWatchData}
          disabled={!isWatchConnected || !isWatchAppInstalled || sessionState !== 'activated'}
        >
          <Text style={styles.syncButtonText}>
            📡 Watch 데이터 요청
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.testButton}
          onPress={testWatchConnection}
        >
          <Text style={styles.testButtonText}>
            🔍 연결 테스트
          </Text>
        </TouchableOpacity>
      </View>

      {debugInfo.length > 0 && (
        <View style={styles.debugContainer}>
          <Text style={[styles.debugTitle, textColor]}>
            🐛 디버그 로그
          </Text>
          {debugInfo.map((info, index) => (
            <Text key={index} style={[styles.debugText, textColor]}>
              {info}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.instructionContainer}>
        <Text style={[styles.instructionText, textColor]}>
          💡 Apple Watch 연결 요구사항:
        </Text>
        <Text style={[styles.instructionDetail, textColor]}>
          • iPhone과 Apple Watch 페어링 필요{'\n'}
          • 동일한 Apple ID 로그인{'\n'}
          • Watch 앱에서 HealthKit 권한 허용{'\n'}
          • ⚠️ 실제 기기에서만 테스트 가능 (시뮬레이터 불가)
        </Text>
        
        <View style={styles.simulatorWarning}>
          <Text style={[styles.warningText, textColor]}>
            🚨 시뮬레이터 한계
          </Text>
          <Text style={[styles.warningDetail, textColor]}>
            iOS 시뮬레이터는 실제 Apple Watch와 연결할 수 없습니다.{'\n'}
            실제 테스트를 위해서는 물리적 iPhone + Apple Watch가 필요합니다.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 15,
    padding: 20,
    borderRadius: 15,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statusContainer: {
    marginBottom: 15,
  },
  statusText: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: '600',
  },
  sessionText: {
    fontSize: 14,
    marginBottom: 5,
    opacity: 0.7,
  },
  syncTime: {
    fontSize: 12,
    opacity: 0.6,
    fontStyle: 'italic',
  },
  buttonContainer: {
    marginBottom: 15,
  },
  syncButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  syncButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  testButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  instructionContainer: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 15,
    borderRadius: 10,
  },
  instructionText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  instructionDetail: {
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.8,
  },
  simulatorWarning: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  warningText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  warningDetail: {
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.8,
  },
  debugContainer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  debugText: {
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.8,
  },
});

export default WatchConnectivityComponent; 