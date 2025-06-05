import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  useColorScheme,
} from 'react-native';
import AppleHealthKit, {
  HealthInputOptions,
  HealthKitPermissions,
} from 'react-native-health';
import FocusPredictionCard from './FocusPredictionCard';
import focusAnalysisAPI, { BiometricData } from '../services/FocusAnalysisAPI';

const REFRESH_INTERVAL_MINUTES = 15; // 집중력 예측 주기(분) - 개발자가 쉽게 변경 가능
const REFRESH_INTERVAL_MS = REFRESH_INTERVAL_MINUTES * 60 * 1000;

const permissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.HeartRate,
      AppleHealthKit.Constants.Permissions.StepCount,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.RestingHeartRate,
      AppleHealthKit.Constants.Permissions.HeartRateVariability,
      AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
    ],
    write: [],
  },
} as HealthKitPermissions;

const FocusScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);
  const isDarkMode = useColorScheme() === 'dark';
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeHealthKit();
    fetchHealthData(); // 최초 1회 실행
    intervalRef.current = setInterval(fetchHealthData, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const initializeHealthKit = async () => {
    return new Promise<void>((resolve, reject) => {
      AppleHealthKit.initHealthKit(permissions, (err: any) => {
        if (err) {
          console.error('❌ HealthKit 초기화 오류:', err);
          Alert.alert('오류', 'HealthKit을 초기화할 수 없습니다.');
          reject(err);
        } else {
          console.log('✅ HealthKit 초기화 성공');
          resolve();
        }
      });
    });
  };

  const fetchHealthData = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const options: HealthInputOptions = {
        startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        endDate: now.toISOString(),
      };

      // 심박수 데이터
      const heartRate = await new Promise<any[]>((resolve, reject) => {
        AppleHealthKit.getHeartRateSamples(options, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
      const latestHeartRate = heartRate[heartRate.length - 1]?.value || 0;

      // 걸음 수
      const steps = await new Promise<any>((resolve, reject) => {
        AppleHealthKit.getStepCount(options, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
      const stepCount = steps.value || 0;

      // 수면 분석
      const sleepAnalysis = await new Promise<any[]>((resolve, reject) => {
        AppleHealthKit.getSleepSamples(options, (err, results: any[]) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
      const sleepHours = calculateSleepHours(sleepAnalysis as any[]);

      // 활동 에너지
      const activeEnergy = await new Promise<any>((resolve, reject) => {
        AppleHealthKit.getActiveEnergyBurned(options, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
      const activityLevel = calculateActivityLevel(activeEnergy.value || 0);

      // 안정시 심박수
      const restingHeartRate = await new Promise<any[]>((resolve, reject) => {
        AppleHealthKit.getRestingHeartRate(options, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
      const stressLevel = calculateStressLevel(
        latestHeartRate,
        restingHeartRate[restingHeartRate.length - 1]?.value || 0
      );

      // 생체 데이터 구성
      const biometricData: BiometricData = {
        user_id: 'user123', // 임시 사용자 ID
        timestamp: new Date().toISOString(),
        heart_rate: latestHeartRate,
        sleep_hours: sleepHours,
        steps: stepCount,
        stress_level: stressLevel,
        activity_level: activityLevel,
        caffeine_intake: 0, // HealthKit에서 제공하지 않는 데이터
        water_intake: 0, // HealthKit에서 제공하지 않는 데이터
      };

      // 집중력 예측 요청
      const prediction = await focusAnalysisAPI.predictFocus(biometricData);
      setPrediction(prediction);
    } catch (error) {
      console.error('❌ 건강 데이터 수집 오류:', error);
      Alert.alert('오류', '건강 데이터를 가져오는 중 문제가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSleepHours = (sleepData: any[]): number => {
    if (!sleepData.length) return 0;
    let totalSleepMinutes = 0;
    sleepData.forEach(sleep => {
      if (sleep.value === 'INBED' || sleep.value === 'ASLEEP') {
        const start = new Date(sleep.startDate);
        const end = new Date(sleep.endDate);
        totalSleepMinutes += (end.getTime() - start.getTime()) / (1000 * 60);
      }
    });
    return totalSleepMinutes / 60; // 시간 단위로 변환
  };

  const calculateActivityLevel = (activeEnergy: number): number => {
    // 활동 에너지(kcal)를 0-10 스케일로 변환
    return Math.min(10, Math.max(0, activeEnergy / 500));
  };

  const calculateStressLevel = (currentHR: number, restingHR: number): number => {
    if (!restingHR) return 5; // 기본값
    const hrDiff = currentHR - restingHR;
    // 심박수 차이를 0-10 스케일로 변환
    return Math.min(10, Math.max(0, hrDiff / 10));
  };

  return (
    <ScrollView style={[styles.container, isDarkMode && styles.darkContainer]}>
      <View style={styles.header}>
        <Text style={[styles.title, isDarkMode && styles.darkText]}>
          🧠 AI 집중력 분석 (자동 + 수동)
        </Text>
        <Text style={{ color: isDarkMode ? '#fff' : '#333', marginTop: 8, fontSize: 14 }}>
          {`분석 주기: ${REFRESH_INTERVAL_MINUTES}분 (코드에서 변경 가능)`}
        </Text>
        <View style={{ marginTop: 16 }}>
          <Text style={{ color: isDarkMode ? '#aaa' : '#666', fontSize: 13, marginBottom: 4 }}>
            수동으로 즉시 분석하려면 아래 버튼을 누르세요
          </Text>
          <View style={styles.buttonWrapper}>
            <Text style={{ marginRight: 8, color: isDarkMode ? '#fff' : '#333', fontSize: 15 }}>
              ⏱️
            </Text>
            <Text
              style={[
                styles.analyzeButton,
                isLoading && { backgroundColor: '#aaa' },
                isDarkMode && { backgroundColor: isLoading ? '#444' : '#007AFF' },
              ]}
              onPress={isLoading ? undefined : fetchHealthData}
            >
              {isLoading ? '분석 중...' : '즉시 분석'}
            </Text>
          </View>
        </View>
      </View>
      <FocusPredictionCard
        prediction={prediction}
        onRefresh={fetchHealthData}
        isLoading={isLoading}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  darkContainer: {
    backgroundColor: '#1c1c1e',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  darkText: {
    color: '#fff',
  },
  buttonWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  analyzeButton: {
    backgroundColor: '#007AFF',
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    overflow: 'hidden',
    textAlign: 'center',
  },
});

export default FocusScreen; 