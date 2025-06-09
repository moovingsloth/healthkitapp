import axios from 'axios';
import { ConcentrationPrediction } from '../types/api';

// API 기본 URL 설정
const API_BASE_URL = 'http://174.138.40.56:8000';

// 올바른 API 경로 설정
const API_ENDPOINTS = {
  HEALTH_METRICS: '/api/health-metrics',
  FOCUS_PATTERN: '/api/user/{userId}/focus-pattern',
  CONCENTRATION_PREDICT: '/predict/concentration'  // 백엔드와 일치하도록 수정
};

export class FocusAnalysisAPI {
  /**
   * 사용자의 집중 패턴 데이터를 조회합니다
   * @param userId 사용자 ID
   * @param startDate 시작 날짜 (YYYY-MM-DD)
   * @param endDate 종료 날짜 (YYYY-MM-DD)
   */
  async getUserFocusPattern(userId: string, startDate?: string, endDate?: string): Promise<any> {
    try {
      const url = `${API_BASE_URL}/api/user/${userId}/focus-pattern`;
      
      // 날짜 파라미터가 있으면 쿼리 파라미터로 추가
      const params: any = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      
      console.log(`Requesting focus pattern: ${url}`, params);
      
      const response = await axios.get(url, { params });
      return response.data;
    } catch (error: any) {
      console.error('집중 패턴 데이터 조회 중 오류:', error);
      
      // 데이터 없음 오류 처리
      if (error.response?.status === 500) {
        console.log('서버에서 데이터를 찾지 못했습니다. 빈 데이터를 반환합니다.');
        return {
          daily_average: 0.0,
          weekly_trend: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
          peak_hours: [],
          improvement_areas: ["아직 데이터가 없습니다. 활동을 기록해주세요."]
        };
      }
      throw error;
    }
  }
  
  /**
   * 집중도 예측 API를 호출합니다
   */
  async predictConcentration(healthData: any): Promise<ConcentrationPrediction> {
    try {
      const url = `${API_BASE_URL}/predict/concentration`;
      console.log(`Requesting concentration prediction: ${url}`, healthData);
      
      const response = await axios.post(url, healthData);
      let processedResponse = response.data;
      
      // 응답 유효성 검사 및 표준화 (안전장치로 유지)
      if (processedResponse) {
        // 1. recommendation(단수) -> recommendations(복수) 변환
        if (processedResponse.recommendation && !processedResponse.recommendations) {
          processedResponse.recommendations = 
            Array.isArray(processedResponse.recommendation) 
              ? processedResponse.recommendation 
              : [processedResponse.recommendation];
          delete processedResponse.recommendation;
        }
        
        // 2. recommendations가 문자열인 경우 배열로 변환
        if (typeof processedResponse.recommendations === 'string') {
          processedResponse.recommendations = [processedResponse.recommendations];
        }
        
        // 3. recommendations가 없는 경우 기본값 제공
        if (!processedResponse.recommendations) {
          processedResponse.recommendations = ["데이터를 더 수집하면 정확한 예측이 가능합니다."];
        }
        
        // 4. 빈 배열인 경우 기본값 제공
        if (Array.isArray(processedResponse.recommendations) && 
            processedResponse.recommendations.length === 0) {
          processedResponse.recommendations = ["데이터를 더 수집하면 정확한 예측이 가능합니다."];
        }
        
        // 5. timestamp 확인
        if (!processedResponse.timestamp) {
          processedResponse.timestamp = new Date().toISOString();
        }
      }
      
      console.log('Prediction successful:', processedResponse);
      return processedResponse as ConcentrationPrediction;
      
    } catch (error: any) {
      console.error('집중도 예측 중 오류:', error);
      
      // 오류 로깅 및 처리
      if (error.response) {
        console.error('서버 응답 상태 코드:', error.response.status);
        console.error('서버 응답 데이터:', error.response.data);
      }
      
      // 기본 응답 반환
      const defaultResponse: ConcentrationPrediction = {
        concentration_score: 65,
        confidence: 0.7,
        recommendations: ["데이터를 더 수집하면 정확한 예측이 가능합니다."],
        timestamp: new Date().toISOString()
      };
      
      console.log('Using default response:', defaultResponse);
      return defaultResponse;
    }
  }

  /**
   * 건강 데이터를 서버에 저장합니다
   */
  async saveHealthData(healthData: any): Promise<any> {
    try {
      const url = `${API_BASE_URL}/api/health-metrics`;
      console.log(`[API 요청] 건강 데이터 저장: POST ${url}`);
      console.log(`[요청 데이터] ${JSON.stringify(healthData, null, 2)}`);
      
      const startTime = Date.now();
      const response = await axios.post(url, healthData);
      const endTime = Date.now();
      
      console.log(`[API 응답] (${endTime - startTime}ms) 상태 코드: ${response.status}`);
      console.log(`[응답 내용] ${JSON.stringify(response.data, null, 2)}`);
      return response.data;
    } catch (error: any) {
      console.error('[API 오류] 건강 데이터 저장 실패');
      
      if (error.response) {
        console.error(`[응답 상태] ${error.response.status}`);
        console.error(`[응답 데이터] ${JSON.stringify(error.response.data, null, 2)}`);
      } else if (error.request) {
        console.error('[네트워크 오류] 서버로부터 응답이 없습니다');
      } else {
        console.error(`[요청 오류] ${error.message}`);
      }
      
      throw error;
    }
  }
  
  /**
   * 연결 테스트: 서버 상태를 확인합니다
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);  // 경로 수정 (/status -> /health)
      return response.status === 200;
    } catch (error) {
      console.error('서버 연결 테스트 실패:', error);
      return false;
    }
  }
}

// 기본 인스턴스 생성 (싱글톤 패턴)
const focusAPI = new FocusAnalysisAPI();

// 클래스와 인스턴스 둘 다 export
export { FocusAnalysisAPI };
export default focusAPI;