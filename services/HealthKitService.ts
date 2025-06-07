import AppleHealthKit, { 
  HealthInputOptions, 
  HealthKitPermissions,
  HealthValue,
  HealthUnit
} from 'react-native-health';
import { NativeModules, Platform } from 'react-native';

const { HealthKitModule } = NativeModules;

// HealthKit 접근 권한 설정
const permissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.HeartRate,
      AppleHealthKit.Constants.Permissions.StepCount,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.RestingHeartRate,
    ],
    write: [],
  },
} as HealthKitPermissions;

// 초기화 및 권한 요청 함수
export const initHealthKit = () => {
  return new Promise((resolve, reject) => {
    if (Platform.OS !== 'ios') {
      reject('HealthKit is available only on iOS');
      return;
    }

    AppleHealthKit.initHealthKit(permissions, (error: string) => {
      if (error) {
        reject(error);
        return;
      }
      
      resolve(true);
    });
  });
};

// 건강 데이터 가져오기
export const fetchHealthData = async () => {
  try {
    if (Platform.OS !== 'ios') {
      console.log('HealthKit is only available on iOS');
      return getDummyData();
    }

    // 초기화 및 권한 확인
    await initHealthKit().catch(err => {
      console.error('HealthKit initialization failed', err);
      return getDummyData();
    });

    // 현재 날짜 및 옵션 설정
    const options = {
      startDate: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(), // 오늘 자정
      endDate: new Date().toISOString(), // 현재 시간
    };

    // 심박수 데이터 가져오기
    const heartRateData = await getHeartRateData(options);
    
    // 걸음 수 데이터 가져오기
    const stepsData = await getStepsData(options);
    
    // 수면 데이터 가져오기
    const sleepData = await getSleepData(options);
    
    // 활동 에너지 소모량 가져오기
    const energyData = await getActiveEnergyData(options);

    const healthData = {
      heartRate: heartRateData,
      steps: stepsData,
      sleep: sleepData,
      activeEnergy: energyData
    };

    console.log('HealthKit Data:', healthData);
    return healthData;
  } catch (error) {
    console.error('HealthKit Error:', error);
    return getDummyData();
  }
};

// 심박수 데이터 가져오기
const getHeartRateData = (options: HealthInputOptions): Promise<number> => {
  return new Promise((resolve) => {
    AppleHealthKit.getHeartRateSamples(options, (err: Object, results: Array<HealthValue>) => {
      if (err) {
        console.error('Error getting heart rate:', err);
        resolve(0);
        return;
      }
      
      // 최신 심박수 또는 평균 심박수 계산
      if (results.length > 0) {
        const latestHeartRate = results[results.length - 1].value;
        resolve(Math.round(latestHeartRate));
      } else {
        resolve(0);
      }
    });
  });
};

// 걸음 수 데이터 가져오기
const getStepsData = (options: HealthInputOptions): Promise<number> => {
  return new Promise((resolve) => {
    AppleHealthKit.getDailyStepCountSamples(options, (err: Object, results: Array<HealthValue>) => {
      if (err) {
        console.error('Error getting steps:', err);
        resolve(0);
        return;
      }
      
      // 오늘 걸음 수 합계
      if (results.length > 0) {
        const totalSteps = results.reduce((sum, item) => sum + item.value, 0);
        resolve(Math.round(totalSteps));
      } else {
        resolve(0);
      }
    });
  });
};

// 수면 데이터 가져오기
const getSleepData = (options: HealthInputOptions): Promise<number> => {
  return new Promise((resolve) => {
    AppleHealthKit.getSleepSamples(options, (err: Object, results: Array<HealthValue>) => {
      if (err) {
        console.error('Error getting sleep data:', err);
        resolve(0);
        return;
      }
      
      // 수면 시간 계산 (단위: 시간)
      if (results.length > 0) {
        let sleepTime = 0;
        results.forEach(item => {
          const start = new Date(item.startDate).getTime();
          const end = new Date(item.endDate).getTime();
          sleepTime += (end - start) / (1000 * 60 * 60); // 밀리초를 시간으로 변환
        });
        resolve(parseFloat(sleepTime.toFixed(1)));
      } else {
        resolve(0);
      }
    });
  });
};

// 활동 에너지 소모량 가져오기
const getActiveEnergyData = (options: HealthInputOptions): Promise<number> => {
  return new Promise((resolve) => {
    AppleHealthKit.getActiveEnergyBurned(options, (err: Object, results: Array<HealthValue>) => {
      if (err) {
        console.error('Error getting active energy:', err);
        resolve(0);
        return;
      }
      
      // 활동 에너지 소모량 합계 (단위: kcal)
      if (results.length > 0) {
        const totalEnergy = results.reduce((sum, item) => sum + item.value, 0);
        resolve(Math.round(totalEnergy));
      } else {
        resolve(0);
      }
    });
  });
};

// 건강 데이터를 가져오지 못했을 때 사용할 더미 데이터
const getDummyData = () => {
  return {
    heartRate: 72,
    steps: 8500,
    sleep: 7.2,
    activeEnergy: 450
  };
};

// 기간별 심박수 데이터 가져오기
export const fetchHeartRateByPeriod = async (period: 'day' | 'week' | 'month') => {
  try {
    if (Platform.OS !== 'ios') {
      console.log('HealthKit is only available on iOS');
      return getDummyHeartRateData(period);
    }

    // 초기화 및 권한 확인
    await initHealthKit().catch(err => {
      console.error('HealthKit initialization failed', err);
      return getDummyHeartRateData(period);
    });

    const now = new Date();
    let startDate;
    
    // 기간에 따라 시작 날짜 설정
    switch(period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        break;
      case 'week':
        // 7일 전
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        // 30일 전
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    }

    const options = {
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      // 필요한 경우 샘플링 간격 조정
      interval: period === 'day' ? 60 : period === 'week' ? 24 * 60 : 24 * 60, // 분 단위 (일:60분, 주/월:24시간)
    };

    const heartRateData = await getHeartRateSeries(options, period);
    return heartRateData;
  } catch (error) {
    console.error(`Error fetching heart rate for ${period}:`, error);
    return getDummyHeartRateData(period);
  }
};

// 심박수 시계열 데이터 가져오기
const getHeartRateSeries = (options: HealthInputOptions, period: 'day' | 'week' | 'month'): Promise<HeartRateSeries> => {
  return new Promise((resolve) => {
    AppleHealthKit.getHeartRateSamples(options, (err: Object, results: Array<HealthValue>) => {
      if (err) {
        console.error('Error getting heart rate series:', err);
        resolve(getDummyHeartRateData(period));
        return;
      }
      
      if (results.length === 0) {
        resolve(getDummyHeartRateData(period));
        return;
      }
      
      // 결과 처리
      const processedData = processHeartRateData(results, period);
      resolve(processedData);
    });
  });
};

// 심박수 데이터 처리 함수
const processHeartRateData = (results: Array<HealthValue>, period: 'day' | 'week' | 'month'): HeartRateSeries => {
  // 기간별 처리 로직
  switch(period) {
    case 'day':
      return processDailyHeartRate(results);
    case 'week':
      return processWeeklyHeartRate(results);
    case 'month':
      return processMonthlyHeartRate(results);
    default:
      return processDailyHeartRate(results);
  }
};

// 일별 심박수 데이터 처리
const processDailyHeartRate = (results: Array<HealthValue>): HeartRateSeries => {
  // 24시간 배열 초기화 (0~23시)
  const hourlyData = Array(24).fill(0);
  const hourlyCount = Array(24).fill(0);
  
  // 결과를 시간별로 분류
  results.forEach(item => {
    const date = new Date(item.startDate);
    const hour = date.getHours();
    hourlyData[hour] += item.value;
    hourlyCount[hour]++;
  });
  
  // 평균 계산
  const values = hourlyData.map((sum, index) => 
    hourlyCount[index] > 0 ? Math.round(sum / hourlyCount[index]) : 0
  );
  
  // 레이블 생성 (0시~23시)
  const labels = Array(24).fill(0).map((_, i) => `${i}시`);
  
  return {
    labels,
    values,
    period: 'day',
    average: calculateAverage(values),
    max: Math.max(...values),
    min: Math.min(...values.filter(v => v > 0)) || 0
  };
};

// 주간 심박수 데이터 처리
const processWeeklyHeartRate = (results: Array<HealthValue>): HeartRateSeries => {
  // 7일 배열 초기화
  const dailyData = Array(7).fill(0);
  const dailyCount = Array(7).fill(0);
  
  const now = new Date();
  const today = now.getDay(); // 0 (일요일) ~ 6 (토요일)
  
  // 결과를 일별로 분류
  results.forEach(item => {
    const date = new Date(item.startDate);
    // 오늘 기준 몇 일 전인지 계산 (0: 오늘, 1: 어제, ...)
    const daysAgo = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    // 7일 이내 데이터만 처리
    if (daysAgo < 7) {
      dailyData[daysAgo] += item.value;
      dailyCount[daysAgo]++;
    }
  });
  
  // 평균 계산
  const values = dailyData.map((sum, index) => 
    dailyCount[index] > 0 ? Math.round(sum / dailyCount[index]) : 0
  );
  
  // 한국어 요일 레이블
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const labels = Array(7).fill(0).map((_, i) => {
    // 오늘부터 역순으로 요일 계산
    const dayIndex = (today - i + 7) % 7;
    return dayNames[dayIndex];
  }).reverse(); // 과거부터 현재 순서로 정렬
  
  return {
    labels,
    values: values.reverse(), // 레이블과 맞추기 위해 역순
    period: 'week',
    average: calculateAverage(values),
    max: Math.max(...values),
    min: Math.min(...values.filter(v => v > 0)) || 0
  };
};

// 월간 심박수 데이터 처리
const processMonthlyHeartRate = (results: Array<HealthValue>): HeartRateSeries => {
  // 30일 배열 초기화
  const dailyData = Array(30).fill(0);
  const dailyCount = Array(30).fill(0);
  
  const now = new Date();
  
  // 결과를 일별로 분류
  results.forEach(item => {
    const date = new Date(item.startDate);
    // 오늘 기준 몇 일 전인지 계산
    const daysAgo = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    // 30일 이내 데이터만 처리
    if (daysAgo < 30) {
      dailyData[daysAgo] += item.value;
      dailyCount[daysAgo]++;
    }
  });
  
  // 평균 계산
  const values = dailyData.map((sum, index) => 
    dailyCount[index] > 0 ? Math.round(sum / dailyCount[index]) : 0
  );
  
  // 날짜 레이블 생성 (월/일)
  const labels = Array(30).fill(0).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }).reverse(); // 과거부터 현재 순서로 정렬
  
  return {
    labels,
    values: values.reverse(), // 레이블과 맞추기 위해 역순
    period: 'month',
    average: calculateAverage(values),
    max: Math.max(...values),
    min: Math.min(...values.filter(v => v > 0)) || 0
  };
};

// 평균값 계산 함수
const calculateAverage = (values: number[]): number => {
  const validValues = values.filter(v => v > 0);
  if (validValues.length === 0) return 0;
  const sum = validValues.reduce((a, b) => a + b, 0);
  return Math.round(sum / validValues.length);
};

// 심박수 시계열 데이터 타입
interface HeartRateSeries {
  labels: string[];  // 시간/날짜 레이블
  values: number[];  // 심박수 값
  period: 'day' | 'week' | 'month';  // 기간
  average: number;   // 평균 심박수
  max: number;       // 최대 심박수
  min: number;       // 최소 심박수
}

// 더미 심박수 데이터 생성
const getDummyHeartRateData = (period: 'day' | 'week' | 'month'): HeartRateSeries => {
  switch(period) {
    case 'day': {
      // 24시간 더미 데이터
      const values = [60, 62, 58, 55, 54, 52, 56, 65, 72, 75, 78, 80, 82, 79, 77, 76, 78, 82, 79, 75, 72, 68, 65, 62];
      return {
        labels: Array(24).fill(0).map((_, i) => `${i}시`),
        values,
        period: 'day',
        average: 70,
        max: 82,
        min: 52
      };
    }
    case 'week': {
      // 일주일 더미 데이터
      const values = [68, 72, 75, 71, 69, 74, 73];
      const dayNames = ['월', '화', '수', '목', '금', '토', '일'];
      return {
        labels: dayNames,
        values,
        period: 'week',
        average: 72,
        max: 75,
        min: 68
      };
    }
    case 'month': {
      // 한 달 더미 데이터 (간략하게 10일 단위로)
      const values = Array(30).fill(0).map(() => Math.floor(Math.random() * 20) + 60);
      const labels = Array(30).fill(0).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        return `${d.getMonth() + 1}/${d.getDate()}`;
      });
      return {
        labels,
        values,
        period: 'month',
        average: 71,
        max: Math.max(...values),
        min: Math.min(...values)
      };
    }
    default:
      return getDummyHeartRateData('day');
  }
};
