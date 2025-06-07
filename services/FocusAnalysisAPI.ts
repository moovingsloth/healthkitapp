/**
 * FocusAnalysisAPI.ts
 * 생체 데이터를 기반으로 집중력을 예측하는 백엔드 API 서비스
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// FastAPI 백엔드 API 기본 URL (로컬 개발 환경)
// const API_BASE_URL = 'http://localhost:8000';
const API_BASE_URL = 'http://174.138.40.56:8000';

// API 클라이언트 설정
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 인터셉터 설정
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료 처리
      await AsyncStorage.removeItem('auth_token');
      // 로그인 화면으로 리다이렉트
    }
    return Promise.reject(error);
  }
);

// 집중력 예측을 위한 생체 데이터 인터페이스
export interface BiometricData {
  user_id: string;
  timestamp: string;
  heart_rate: number;
  sleep_hours: number;
  steps: number;
  stress_level: number;
  activity_level: number;
  caffeine_intake: number;
  water_intake: number;
}

// 집중력 예측 결과 인터페이스
export interface ConcentrationPrediction {
  concentration_score: number;
  confidence: number;
  recommendations: string[];
  timestamp: string;
}

export interface FocusAnalysis {
  daily_average: number;
  weekly_trend: number[];
  peak_hours: string[];
  improvement_areas: string[];
}

export interface UserProfile {
  user_id: string;
  name: string;
  age: number;
  gender: string;
  height: number;
  weight: number;
  activity_goal: number;
}

// 생체 데이터 시간 범위 타입
export type TimeRange = 'short' | 'medium' | 'long';

// 생체 데이터 응답 인터페이스
export interface BiometricDataResponse {
  data: BiometricData[];
  summary: {
    average_heart_rate: number;
    total_sleep_hours: number;
    total_steps: number;
    average_stress_level: number;
    average_activity_level: number;
  };
}

// 생체 데이터 필터 옵션
export interface BiometricDataFilter {
  startDate?: string;
  endDate?: string;
  metrics?: Array<keyof BiometricData>;
}

class FocusAnalysisAPI {
  
  /**
   * 생체 데이터를 백엔드로 전송하여 집중력 예측
   */
  async predictFocus(data: BiometricData): Promise<ConcentrationPrediction> {
    try {
      console.log('🧠 집중력 예측 요청 중...', data);
      
      // 필수 필드 추가 (서버 요구사항에 맞게 필드명 매핑)
      const requestData = {
        user_id: data.user_id || 'user123',
        date: data.timestamp || new Date().toISOString(),
        heart_rate_avg: data.heart_rate || 0,
        heart_rate_resting: 0, // 필요시 실제 데이터로 대체
        sleep_duration: data.sleep_hours || 0,
        sleep_quality: 0, // 필요시 실제 데이터로 대체
        steps_count: data.steps || 0,
        active_calories: 0 // 필요시 실제 데이터로 대체
      };
      
      console.log('API 요청 데이터:', requestData);
      
      // FastAPI 엔드포인트로 데이터 전송
      const response = await apiClient.post('/predict/concentration', requestData);
      
      console.log('✅ 집중력 예측 결과 수신:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('❌ 집중력 예측 오류:', error);
      
      // 오프라인 또는 서버 오류 시 목업 데이터 반환
      return this.getMockPrediction(data);
    }
  }
  
  /**
   * 생체 데이터 기록 저장 (학습 데이터용)
   */
  async saveBiometricData(data: BiometricData): Promise<void> {
    try {
      await apiClient.post('/api/health-metrics', data);
    } catch (error) {
      console.error('❌ 생체 데이터 저장 오류:', error);
      // 오프라인 모드: 로컬 스토리지에 저장
      await this.saveOfflineData(data);
    }
  }
  
  /**
   * 사용자별 집중력 패턴 분석
   */
  async getUserFocusPattern(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<FocusAnalysis> {
    try {
      const response = await apiClient.get(`/api/user/${userId}/focus-pattern`, {
        params: { start_date: startDate, end_date: endDate }
      });
      return response.data;
    } catch (error) {
      console.error('❌ 집중력 패턴 조회 오류:', error);
      throw error;
    }
  }
  
  /**
   * 사용자 프로필 조회
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      const response = await apiClient.get(`/api/user/${userId}/profile`);
      return response.data;
    } catch (error) {
      console.error('❌ 사용자 프로필 조회 오류:', error);
      throw error;
    }
  }
  
  /**
   * 오프라인 모드 지원
   */
  private async saveOfflineData(data: BiometricData): Promise<void> {
    try {
      const offlineData = await AsyncStorage.getItem('offline_biometric_data');
      const dataArray = offlineData ? JSON.parse(offlineData) : [];
      dataArray.push(data);
      await AsyncStorage.setItem('offline_biometric_data', JSON.stringify(dataArray));
    } catch (error) {
      console.error('❌ 오프라인 데이터 저장 오류:', error);
    }
  }
  
  async syncOfflineData(): Promise<void> {
    try {
      const offlineData = await AsyncStorage.getItem('offline_biometric_data');
      if (offlineData) {
        const dataArray = JSON.parse(offlineData);
        for (const data of dataArray) {
          await this.saveBiometricData(data);
        }
        await AsyncStorage.removeItem('offline_biometric_data');
      }
    } catch (error) {
      console.error('❌ 오프라인 데이터 동기화 오류:', error);
    }
  }
  
  /**
   * 목업 데이터 생성 (개발/테스트용)
   */
  private getMockPrediction(data: BiometricData): ConcentrationPrediction {
    const score = this.calculateMockScore(data);
    const recommendations = this.generateMockRecommendations(data, score);
    
    return {
      concentration_score: score,
      confidence: 0.8,
      recommendations,
      timestamp: new Date().toISOString()
    };
  }
  
  private calculateMockScore(data: BiometricData): number {
    let score = 70; // 기본 점수

    // 수면 시간 기반 조정
    if (data.sleep_hours < 6) score -= 10;
    else if (data.sleep_hours > 8) score -= 5;

    // 스트레스 레벨 기반 조정
    score -= data.stress_level * 2;

    // 활동량 기반 조정
    if (data.steps < 5000) score -= 5;
    else if (data.steps > 10000) score += 5;

    // 카페인 섭취 기반 조정
    if (data.caffeine_intake > 200) score -= 5;

    // 수분 섭취 기반 조정
    if (data.water_intake < 1500) score -= 5;

    return Math.max(0, Math.min(100, score));
  }
  
  private generateMockRecommendations(data: BiometricData, score: number): string[] {
    const recommendations: string[] = [];
    
    if (data.sleep_hours < 6) {
      recommendations.push('수면 시간을 늘리는 것이 좋습니다.');
    }
    
    if (data.stress_level > 5) {
      recommendations.push('스트레스 관리가 필요합니다.');
    }
    
    if (data.steps < 5000) {
      recommendations.push('활동량을 늘리는 것이 좋습니다.');
    }
    
    if (data.caffeine_intake > 200) {
      recommendations.push('카페인 섭취를 줄이는 것이 좋습니다.');
    }
    
    if (data.water_intake < 1500) {
      recommendations.push('수분 섭취를 늘리는 것이 좋습니다.');
    }
    
    if (score < 60) {
      recommendations.push('전반적인 건강 관리가 필요합니다.');
    }
    
    return recommendations;
  }

  // 생체 데이터 조회
  async getBiometricData(
    userId: string,
    timeRange: TimeRange,
    filter?: BiometricDataFilter
  ): Promise<BiometricDataResponse> {
    try {
      const response = await apiClient.get(`/api/biometric-data/${userId}`, {
        params: {
          time_range: timeRange,
          ...filter,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching biometric data:', error);
      throw error;
    }
  }

  // 생체 데이터 내보내기
  async exportBiometricData(
    userId: string,
    format: 'csv' | 'json',
    filter?: BiometricDataFilter
  ): Promise<Blob> {
    try {
      const response = await apiClient.get(`/api/biometric-data/${userId}/export`, {
        params: {
          format,
          ...filter,
        },
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting biometric data:', error);
      throw error;
    }
  }

  // 알림 설정 업데이트
  async updateNotificationSettings(
    userId: string,
    settings: {
      heart_rate_threshold?: number;
      sleep_hours_threshold?: number;
      steps_threshold?: number;
      stress_level_threshold?: number;
      activity_level_threshold?: number;
      notification_enabled: boolean;
    }
  ): Promise<void> {
    try {
      await apiClient.put(`/api/users/${userId}/notification-settings`, settings);
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw error;
    }
  }
}

// 싱글톤 인스턴스 생성
const focusAnalysisAPI = new FocusAnalysisAPI();
export default focusAnalysisAPI; 