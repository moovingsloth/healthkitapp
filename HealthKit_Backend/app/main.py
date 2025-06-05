from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging
from typing import Dict, Any

from .model import get_concentration_prediction
from .schemas import (
    HealthDataInput,
    ConcentrationPrediction,
    APIResponse,
    HealthMetrics,
    UserProfile,
    ConcentrationAnalysis
)

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI 앱 생성
app = FastAPI(
    title="HealthKit 집중도 예측 API",
    description="건강 데이터를 기반으로 집중도를 예측하는 API",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 구체적인 도메인 설정 필요
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    """루트 엔드포인트 - API 상태 확인"""
    return {
        "message": "HealthKit 집중도 예측 API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
def health_check():
    """헬스 체크 엔드포인트"""
    return {"status": "healthy", "service": "concentration-prediction-api"}

@app.post("/predict/concentration", response_model=ConcentrationPrediction)
def predict_concentration(health_data: HealthDataInput):
    """
    건강 데이터를 기반으로 집중도를 예측합니다.
    
    Args:
        health_data: 건강 데이터 입력
        
    Returns:
        집중도 예측 결과
    """
    try:
        # 건강 데이터를 딕셔너리로 변환
        health_dict = health_data.dict()
        
        # 집중도 예측
        prediction_result = get_concentration_prediction(health_dict)
        
        # 응답 데이터 구성
        response = ConcentrationPrediction(
            concentration_score=prediction_result["concentration_score"],
            confidence=prediction_result["confidence"],
            recommendations=prediction_result["recommendations"]
        )
        
        logger.info(f"집중도 예측 완료: {prediction_result['concentration_score']:.1f}")
        return response
        
    except Exception as e:
        logger.error(f"집중도 예측 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=f"예측 처리 중 오류가 발생했습니다: {str(e)}")

@app.post("/api/health-metrics", response_model=APIResponse)
def store_health_metrics(metrics: HealthMetrics):
    """
    건강 지표 데이터를 저장합니다.
    
    Args:
        metrics: 건강 지표 데이터
        
    Returns:
        저장 결과
    """
    try:
        # 실제 구현에서는 데이터베이스에 저장
        logger.info(f"건강 지표 저장: 사용자 {metrics.user_id}")
        
        return APIResponse(
            success=True,
            message="건강 지표가 성공적으로 저장되었습니다.",
            data={"user_id": metrics.user_id, "date": str(metrics.date)}
        )
        
    except Exception as e:
        logger.error(f"건강 지표 저장 중 오류: {str(e)}")
        raise HTTPException(status_code=500, detail="건강 지표 저장 중 오류가 발생했습니다.")

@app.get("/api/user/{user_id}/profile", response_model=UserProfile)
def get_user_profile(user_id: str):
    """
    사용자 프로필을 조회합니다.
    
    Args:
        user_id: 사용자 ID
        
    Returns:
        사용자 프로필 정보
    """
    try:
        # 실제 구현에서는 데이터베이스에서 조회
        # 현재는 더미 데이터 반환
        profile = UserProfile(
            user_id=user_id,
            name="사용자",
            age=30,
            gender="unknown",
            height=170.0,
            weight=65.0,
            activity_goal=10000
        )
        
        logger.info(f"사용자 프로필 조회: {user_id}")
        return profile
        
    except Exception as e:
        logger.error(f"사용자 프로필 조회 중 오류: {str(e)}")
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

@app.get("/api/user/{user_id}/concentration-analysis", response_model=ConcentrationAnalysis)
def get_concentration_analysis(user_id: str):
    """
    사용자의 집중도 분석 결과를 조회합니다.
    
    Args:
        user_id: 사용자 ID
        
    Returns:
        집중도 분석 결과
    """
    try:
        # 실제 구현에서는 데이터베이스에서 분석 데이터 조회
        # 현재는 더미 데이터 반환
        analysis = ConcentrationAnalysis(
            daily_average=75.2,
            weekly_trend=[72.1, 74.5, 78.2, 76.8, 75.9, 77.3, 75.2],
            peak_hours=[9, 10, 14, 15],
            improvement_areas=["수면 품질", "스트레스 관리"]
        )
        
        logger.info(f"집중도 분석 조회: {user_id}")
        return analysis
        
    except Exception as e:
        logger.error(f"집중도 분석 조회 중 오류: {str(e)}")
        raise HTTPException(status_code=500, detail="집중도 분석 조회 중 오류가 발생했습니다.")

# 개발용 서버 실행
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)