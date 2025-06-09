// 호환성을 위한 파일 - api 폴더의 FocusAnalysisAPI 재내보내기
import focusAPI, { FocusAnalysisAPI } from '../api/FocusAnalysisAPI';

// 기존 함수 형태의 API 호출을 위한 함수들
export const getUserFocusPattern = (userId: string, startDate?: string, endDate?: string) => 
  focusAPI.getUserFocusPattern(userId, startDate, endDate);

export const predictConcentration = (healthData: any) => 
  focusAPI.predictConcentration(healthData);

// 새로운 함수 추가: 건강 데이터 저장
export const saveHealthData = (healthData: any) => 
  focusAPI.saveHealthData(healthData);

// 클래스와 인스턴스 재내보내기
export { FocusAnalysisAPI };
export default focusAPI;