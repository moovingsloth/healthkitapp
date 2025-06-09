import AppleHealthKit, { 
  HealthInputOptions, 
  HealthKitPermissions, 
  HealthValue, 
  HealthUnit 
} from 'react-native-health';
import { format, subDays } from 'date-fns';
import { saveHealthData } from './FocusAnalysisAPI';

// 필요한 권한 정의
const permissions: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.HeartRate,
      AppleHealthKit.Constants.Permissions.RestingHeartRate,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.StepCount,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
    ],
    write: [],
  },
};

// HealthKit 초기화 및 데이터 동기화
export const initHealthKit = (userId: string) => {
  console.log('🔄 HealthKit 초기화 시작...');
  
  AppleHealthKit.initHealthKit(permissions, (error: string) => {
    if (error) {
      console.error('❌ HealthKit 초기화 실패:', error);
      return;
    }
    
    console.log('✅ HealthKit 초기화 성공');
    
    // HealthKit 초기화 성공 시 일주일치 데이터 동기화
    syncLastWeekData(userId);
  });
};

// 일주일치 데이터 동기화
export const syncLastWeekData = async (userId: string) => {
  console.log('🔄 일주일치 HealthKit 데이터 동기화 시작...');
  console.log(`👤 사용자 ID: ${userId}`);
  
  // 오늘 날짜
  const today = new Date();
  console.log(`📅 현재 날짜: ${format(today, 'yyyy-MM-dd')}`);
  
  // 지난 7일간 데이터 수집
  for (let i = 6; i >= 0; i--) {
    const date = subDays(today, i);
    const formattedDate = format(date, 'yyyy-MM-dd');
    console.log(`\n📊 ${formattedDate} 데이터 수집 중...`);
    
    try {
      // 해당 날짜의 건강 데이터 수집
      const healthData = await collectDailyHealthData(userId, date);
      console.log(`✅ ${formattedDate} 데이터 수집 완료:`, JSON.stringify(healthData, null, 2));
      
      // 서버에 데이터 저장
      console.log(`📤 ${formattedDate} 데이터 서버 저장 요청...`);
      const saveResult = await saveHealthData(healthData);
      console.log(`✅ ${formattedDate} 데이터 저장 성공:`, JSON.stringify(saveResult, null, 2));
    } catch (error) {
      console.error(`❌ ${formattedDate} 데이터 처리 실패:`, error);
    }
    
    // 요청 간 간격 두기 (서버 과부하 방지)
    if (i > 0) {
      console.log('⏱️ 다음 요청 전 잠시 대기 중...');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log('\n✅ 일주일치 데이터 동기화 완료');
};

// 일일 건강 데이터 수집
const collectDailyHealthData = async (userId: string, date: Date): Promise<any> => {
  console.log(`🔍 ${format(date, 'yyyy-MM-dd')} 건강 데이터 수집 중...`);
  
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);
  
  const options = {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
  
  console.log(`⏰ 조회 기간: ${startDate.toISOString()} ~ ${endDate.toISOString()}`);
  
  try {
    // 1. 심박수 데이터
    console.log('❤️ 심박수 데이터 요청 중...');
    const heartRateData = await getHeartRateData(options);
    console.log('❤️ 심박수 데이터 응답:', heartRateData);
    
    // 2. 안정시 심박수
    console.log('💓 안정시 심박수 요청 중...');
    const restingHeartRate = await getRestingHeartRate(options);
    console.log('💓 안정시 심박수 응답:', restingHeartRate);
    
    // 3. 수면 데이터
    console.log('😴 수면 데이터 요청 중...');
    const sleepData = await getSleepData(options);
    console.log('😴 수면 데이터 응답:', sleepData);
    
    // 4. 걸음 수
    console.log('👣 걸음 수 요청 중...');
    const stepsData = await getStepsData(options);
    console.log('👣 걸음 수 응답:', stepsData);
    
    // 5. 활동 칼로리
    console.log('🔥 활동 칼로리 요청 중...');
    const activeCalories = await getActiveCalories(options);
    console.log('🔥 활동 칼로리 응답:', activeCalories);
    
    // 데이터를 API 형식에 맞게 가공
    const formattedData = {
      user_id: userId,
      date: format(date, 'yyyy-MM-dd'),
      heart_rate_avg: heartRateData.avg || 70,
      heart_rate_resting: restingHeartRate.value || 60,
      sleep_duration: sleepData.duration || 7,
      sleep_quality: sleepData.quality || 7,
      steps_count: stepsData.value || 5000,
      active_calories: activeCalories.value || 300,
      stress_level: calculateStressLevel(heartRateData, restingHeartRate),
      activity_level: calculateActivityLevel(stepsData, activeCalories)
    };
    
    console.log('📋 수집된 건강 데이터:', formattedData);
    return formattedData;
  } catch (error) {
    console.error('❌ 건강 데이터 수집 중 오류:', error);
    throw error;
  }
};

/**
 * 특정 날짜의 건강 데이터를 가져옵니다.
 * @param date 데이터를 가져올 날짜(ISO 문자열 또는 Date 객체)
 */
export const fetchHealthData = async (date = new Date()): Promise<any> => {
  try {
    console.log(`🔄 ${typeof date === 'string' ? date : format(date, 'yyyy-MM-dd')} 건강 데이터 가져오는 중...`);
    
    // 날짜가 문자열로 들어온 경우 Date 객체로 변환
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    
    // 해당 날짜의 시작과 끝
    const startDate = new Date(targetDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);
    
    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
    
    // 1. 심박수 데이터
    const heartRateData = await getHeartRateData(options);
    
    // 2. 안정시 심박수
    const restingHeartRate = await getRestingHeartRate(options);
    
    // 3. 수면 데이터
    const sleepData = await getSleepData(options);
    
    // 4. 걸음 수
    const stepsData = await getStepsData(options);
    
    // 5. 활동 칼로리
    const activeCalories = await getActiveCalories(options);
    
    // 스트레스 레벨과 활동 레벨 계산
    const stressLevel = calculateStressLevel(heartRateData, restingHeartRate);
    const activityLevel = calculateActivityLevel(stepsData, activeCalories);
    
    // 데이터 통합
    const healthData = {
      date: format(targetDate, 'yyyy-MM-dd'),
      heart_rate_avg: heartRateData.avg || 70,
      heart_rate_resting: restingHeartRate.value || 60,
      sleep_duration: sleepData.duration || 7,
      sleep_quality: sleepData.quality || 7,
      steps_count: stepsData.value || 5000,
      active_calories: activeCalories.value || 300,
      stress_level: stressLevel,
      activity_level: activityLevel
    };
    
    console.log(`✅ ${format(targetDate, 'yyyy-MM-dd')} 건강 데이터 수집 완료:`, healthData);
    return healthData;
  } catch (error) {
    console.error('❌ 건강 데이터 가져오기 실패:', error);
    
    // 오류 발생 시 기본 데이터 반환
    return {
      date: format(date, 'yyyy-MM-dd'),
      heart_rate_avg: 70,
      heart_rate_resting: 60,
      sleep_duration: 7,
      sleep_quality: 7,
      steps_count: 5000,
      active_calories: 300,
      stress_level: 4,
      activity_level: 3
    };
  }
};

// 서버에 저장된 데이터 확인 함수
export const getStoredHealthData = async (userId: string, date: string): Promise<any> => {
  try {
    console.log(`🔍 ${date} 저장된 건강 데이터 조회 중...`);
    const url = `${API_BASE_URL}/api/user/${userId}/health-metrics?date=${date}`;
    
    const response = await axios.get(url);
    console.log(`✅ 저장된 데이터 조회 성공:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`❌ 저장된 데이터 조회 실패:`, error);
    return null;
  }
};

// 심박수 데이터 가져오기
const getHeartRateData = (options: any): Promise<{ avg: number, max: number, min: number }> => {
  return new Promise((resolve, reject) => {
    AppleHealthKit.getHeartRateSamples(options, (error: string, results: any) => {
      if (error) {
        console.error('❌ 심박수 데이터 가져오기 실패:', error);
        reject(error);
        return;
      }
      
      try {
        console.log(`❤️ 심박수 샘플 ${results.length}개 수신`);
        
        // 결과가 없으면 기본값 반환
        if (!results || results.length === 0) {
          console.log('⚠️ 심박수 데이터 없음, 기본값 사용');
          resolve({ avg: 70, max: 85, min: 60 });
          return;
        }
        
        // 심박수 계산
        const values = results.map((item: any) => item.value);
        const sum = values.reduce((a: number, b: number) => a + b, 0);
        const avg = Math.round(sum / values.length);
        const max = Math.max(...values);
        const min = Math.min(...values);
        
        console.log(`❤️ 심박수 통계: 평균=${avg}, 최대=${max}, 최소=${min}`);
        resolve({ avg, max, min });
      } catch (err) {
        console.error('❌ 심박수 데이터 처리 중 오류:', err);
        resolve({ avg: 70, max: 85, min: 60 });
      }
    });
  });
};

// 안정시 심박수 가져오기
const getRestingHeartRate = (options: any): Promise<{ value: number }> => {
  return new Promise((resolve, reject) => {
    AppleHealthKit.getRestingHeartRate(options, (error: string, results: any) => {
      if (error) {
        console.error('❌ 안정시 심박수 데이터 가져오기 실패:', error);
        resolve({ value: 60 }); // 오류 시 기본값 반환
        return;
      }
      
      try {
        console.log('💓 안정시 심박수 데이터:', results);
        
        // 결과가 없으면 기본값 반환
        if (!results || results.length === 0) {
          console.log('⚠️ 안정시 심박수 데이터 없음, 기본값 사용');
          resolve({ value: 60 });
          return;
        }
        
        const value = Math.round(results.value || 60);
        console.log(`💓 안정시 심박수: ${value}`);
        resolve({ value });
      } catch (err) {
        console.error('❌ 안정시 심박수 데이터 처리 중 오류:', err);
        resolve({ value: 60 });
      }
    });
  });
};

// 수면 데이터 가져오기
const getSleepData = (options: any): Promise<{ duration: number, quality: number }> => {
  return new Promise((resolve, reject) => {
    AppleHealthKit.getSleepSamples(options, (error: string, results: any) => {
      if (error) {
        console.error('❌ 수면 데이터 가져오기 실패:', error);
        resolve({ duration: 7, quality: 7 }); // 오류 시 기본값 반환
        return;
      }
      
      try {
        console.log(`😴 수면 샘플 ${results.length}개 수신`);
        
        // 결과가 없으면 기본값 반환
        if (!results || results.length === 0) {
          console.log('⚠️ 수면 데이터 없음, 기본값 사용');
          resolve({ duration: 7, quality: 7 });
          return;
        }
        
        // 수면 시간 계산 (시간 단위)
        let totalSleepTime = 0;
        results.forEach((item: any) => {
          const start = new Date(item.startDate).getTime();
          const end = new Date(item.endDate).getTime();
          const duration = (end - start) / (1000 * 60 * 60); // 시간 단위로 변환
          totalSleepTime += duration;
        });
        
        const duration = parseFloat(totalSleepTime.toFixed(1));
        
        // 수면 품질은 수면 시간에 기반한 추정치 (6~9시간이 최적)
        let quality = 7; // 기본값
        if (duration >= 7 && duration <= 9) {
          quality = 9;
        } else if (duration >= 6 && duration < 7) {
          quality = 7;
        } else if (duration >= 9 && duration < 10) {
          quality = 7;
        } else if (duration >= 5 && duration < 6) {
          quality = 5;
        } else if (duration > 10) {
          quality = 6;
        } else if (duration < 5) {
          quality = 4;
        }
        
        console.log(`😴 수면 데이터: 시간=${duration}시간, 품질=${quality}/10`);
        resolve({ duration, quality });
      } catch (err) {
        console.error('❌ 수면 데이터 처리 중 오류:', err);
        resolve({ duration: 7, quality: 7 });
      }
    });
  });
};

// 걸음 수 가져오기
const getStepsData = (options: any): Promise<{ value: number }> => {
  return new Promise((resolve, reject) => {
    AppleHealthKit.getDailyStepCountSamples(options, (error: string, results: any) => {
      if (error) {
        console.error('❌ 걸음 수 데이터 가져오기 실패:', error);
        resolve({ value: 5000 }); // 오류 시 기본값 반환
        return;
      }
      
      try {
        console.log(`👣 걸음 수 샘플 ${results.length}개 수신`);
        
        // 결과가 없으면 기본값 반환
        if (!results || results.length === 0) {
          console.log('⚠️ 걸음 수 데이터 없음, 기본값 사용');
          resolve({ value: 5000 });
          return;
        }
        
        // 해당 날짜의 총 걸음 수 계산
        let totalSteps = 0;
        results.forEach((item: any) => {
          totalSteps += item.value;
        });
        
        const value = Math.round(totalSteps);
        console.log(`👣 총 걸음 수: ${value}걸음`);
        resolve({ value });
      } catch (err) {
        console.error('❌ 걸음 수 데이터 처리 중 오류:', err);
        resolve({ value: 5000 });
      }
    });
  });
};

// 활동 칼로리 가져오기
const getActiveCalories = (options: any): Promise<{ value: number }> => {
  return new Promise((resolve, reject) => {
    AppleHealthKit.getActiveEnergyBurned(options, (error: string, results: any) => {
      if (error) {
        console.error('❌ 활동 칼로리 데이터 가져오기 실패:', error);
        resolve({ value: 300 }); // 오류 시 기본값 반환
        return;
      }
      
      try {
        console.log(`🔥 활동 칼로리 샘플 ${results.length}개 수신`);
        
        // 결과가 없으면 기본값 반환
        if (!results || results.length === 0) {
          console.log('⚠️ 활동 칼로리 데이터 없음, 기본값 사용');
          resolve({ value: 300 });
          return;
        }
        
        // 해당 날짜의 총 활동 칼로리 계산
        let totalCalories = 0;
        results.forEach((item: any) => {
          totalCalories += item.value;
        });
        
        const value = Math.round(totalCalories);
        console.log(`🔥 총 활동 칼로리: ${value}kcal`);
        resolve({ value });
      } catch (err) {
        console.error('❌ 활동 칼로리 데이터 처리 중 오류:', err);
        resolve({ value: 300 });
      }
    });
  });
};

// 스트레스 레벨 계산 (심박수 기반 추정)
const calculateStressLevel = (heartRate: any, restingHR: any): number => {
  try {
    if (!heartRate.avg || !restingHR.value) return 4; // 기본값
    
    // 안정시 심박수 대비 평균 심박수 비율로 스트레스 추정
    const ratio = heartRate.avg / restingHR.value;
    
    let stressLevel = 4; // 기본값 (중간)
    if (ratio < 1.05) stressLevel = 2; // 매우 낮음
    else if (ratio < 1.1) stressLevel = 3; // 낮음
    else if (ratio < 1.2) stressLevel = 4; // 중간
    else if (ratio < 1.3) stressLevel = 6; // 높음
    else stressLevel = 8; // 매우 높음
    
    console.log(`😰 스트레스 레벨 계산: ${stressLevel}/10 (심박비율: ${ratio.toFixed(2)})`);
    return stressLevel;
  } catch (err) {
    console.error('❌ 스트레스 레벨 계산 중 오류:', err);
    return 4; // 기본값
  }
};

// 활동 레벨 계산 (걸음 수와 칼로리 기반)
const calculateActivityLevel = (steps: any, calories: any): number => {
  try {
    if (!steps.value || !calories.value) return 3; // 기본값
    
    // 걸음 수 기반 활동 레벨 추정
    let activityLevel = 3; // 기본값 (중간)
    
    if (steps.value < 3000) activityLevel = 1; // 매우 낮음
    else if (steps.value < 5000) activityLevel = 2; // 낮음
    else if (steps.value < 8000) activityLevel = 3; // 중간
    else if (steps.value < 12000) activityLevel = 4; // 높음
    else activityLevel = 5; // 매우 높음
    
    // 칼로리 소모가 높을 경우 보정
    if (calories.value > 500 && activityLevel < 5) activityLevel += 1;
    
    console.log(`🏃 활동 레벨 계산: ${activityLevel}/5 (걸음: ${steps.value}, 칼로리: ${calories.value})`);
    return activityLevel;
  } catch (err) {
    console.error('❌ 활동 레벨 계산 중 오류:', err);
    return 3; // 기본값
  }
};

/**
 * 최근 24시간 동안의 시간별 집중도 추정 데이터를 가져옵니다.
 * @returns {Promise<Array<number>>} 시간별 집중도 추정치 (24시간)
 */
export const fetchHourlyHealthData = async (): Promise<number[]> => {
  try {
    console.log('🔍 시간별 집중도 데이터 계산 중...');
    
    const hourlyFocusData: number[] = [];
    const now = new Date();
    
    // 지난 24시간 동안의 시간별 데이터 수집
    for (let i = 23; i >= 0; i--) {
      try {
        const hourDate = new Date(now);
        hourDate.setHours(now.getHours() - i);
        
        // 시간별 건강 데이터 수집 범위 설정
        const startDate = new Date(hourDate);
        startDate.setMinutes(0, 0, 0);
        
        const endDate = new Date(hourDate);
        endDate.setMinutes(59, 59, 999);
        
        const options = {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        };
        
        // 심박수, 걸음 수, 활동 칼로리 데이터 가져오기 
        const heartRateData = await getHeartRateData(options);
        const stepsData = await getStepsData(options);
        const caloriesData = await getActiveCalories(options);
        
        // 집중도 점수 계산 (심박수 변동, 활동량, 칼로리 소모 등을 기반으로)
        let focusScore = 70; // 기본값
        
        if (heartRateData.avg) {
          // 심박수 기반 점수 조정 (정상 범위 60-100bpm 근처가 최적)
          const hrScore = calculateHRBasedFocus(heartRateData.avg);
          
          // 활동 기반 점수 조정
          const activityScore = calculateActivityBasedFocus(stepsData.value, caloriesData.value, hourDate.getHours());
          
          // 최종 집중도 점수 계산 (가중치 적용)
          focusScore = Math.round(hrScore * 0.7 + activityScore * 0.3);
          
          // 범위 제한 (0-100)
          focusScore = Math.max(0, Math.min(100, focusScore));
        }
        
        hourlyFocusData.push(focusScore);
      } catch (hourError) {
        console.error(`❌ ${i}시간 전 데이터 처리 중 오류:`, hourError);
        // 오류 시 기본값 사용
        hourlyFocusData.push(70);
      }
    }
    
    console.log(`✅ 시간별 집중도 데이터 계산 완료: ${hourlyFocusData.length}개 항목`);
    return hourlyFocusData;
  } catch (error) {
    console.error('❌ 시간별 집중도 데이터 가져오기 실패:', error);
    
    // 오류 발생 시 기본 데이터 반환 (24시간 더미 데이터)
    return [70, 72, 68, 75, 80, 78, 74, 76, 77, 73, 71, 69, 72, 74, 76, 78, 80, 82, 81, 79, 77, 75, 73, 72];
  }
};

/**
 * 심박수 기반 집중도 점수 계산
 * @param {number} heartRate 심박수
 * @returns {number} 집중도 점수 (0-100)
 */
const calculateHRBasedFocus = (heartRate: number): number => {
  // 심박수가 너무 낮거나(50 이하) 너무 높으면(100 이상) 집중도 감소
  if (heartRate <= 50) return 60; // 너무 낮은 심박수 - 졸음/피로
  if (heartRate >= 100) return 50; // 너무 높은 심박수 - 스트레스/불안
  
  // 최적 심박수 범위 (65-85)에서 최고 점수
  if (heartRate >= 65 && heartRate <= 85) {
    return 85 + (Math.abs(75 - heartRate) / 10 * -5); // 75에 가까울수록 최대 85점
  }
  
  // 그 외 범위는 점수 감소
  if (heartRate < 65) {
    return 70 + ((heartRate - 50) / 15) * 15; // 50-65 범위에서 70-85점
  }
  
  // 85-100 범위
  return 85 - ((heartRate - 85) / 15) * 35; // 85-100 범위에서 85-50점
};

/**
 * 활동 기반 집중도 점수 계산
 * @param {number} steps 걸음 수
 * @param {number} calories 활동 칼로리
 * @param {number} hour 시간 (0-23)
 * @returns {number} 집중도 점수 (0-100)
 */
const calculateActivityBasedFocus = (steps: number, calories: number, hour: number): number => {
  // 기본 점수
  let score = 70;
  
  // 시간대별 최적 활동량 (오전/오후에 적절한 활동이 집중력에 도움)
  const isWorkHour = hour >= 9 && hour <= 18;
  const isEveningHour = hour >= 19 && hour <= 22;
  const isNightHour = hour >= 23 || hour <= 5;
  
  if (isWorkHour) {
    // 업무 시간 - 적절한 활동(500-2000걸음/시간)이 집중에 도움
    if (steps < 100) score -= 10; // 너무 적은 활동
    else if (steps > 2500) score -= 15; // 너무 많은 활동은 집중 방해
    else if (steps >= 300 && steps <= 2000) score += 15; // 적절한 활동
  } else if (isEveningHour) {
    // 저녁 시간 - 적당한 활동이 좋음
    if (steps >= 200 && steps <= 1500) score += 10;
    else if (steps > 3000) score -= 20; // 저녁에 과도한 활동은 집중력 저하
  } else if (isNightHour) {
    // 야간 - 활동이 적을수록 좋음
    if (steps < 100) score += 5;
    else if (steps > 1000) score -= 25;
  } else {
    // 아침 - 가벼운 활동이 도움
    if (steps >= 300 && steps <= 2000) score += 20;
  }
  
  // 칼로리 소모에 따른 조정
  if (calories > 100) score -= 10; // 많은 칼로리 소모는 일시적으로 집중력 저하 가능
  
  // 범위 제한
  return Math.max(0, Math.min(100, score));
};
