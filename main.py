from fastapi import FastAPI, HTTPException, Depends, APIRouter, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import uvicorn
import logging
import sys

from app.model import ConcentrationModel, get_concentration_prediction

app = FastAPI(title="HealthKit Focus Analysis API")
router = APIRouter(prefix="/api")  # '/api' 접두사 추가

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 환경에서는 모든 origin 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 데이터 모델
class BiometricData(BaseModel):
    user_id: str
    timestamp: str
    heart_rate: float
    sleep_hours: float
    steps: int
    stress_level: float
    activity_level: float
    caffeine_intake: float
    water_intake: float

class ConcentrationPrediction(BaseModel):
    concentration_score: float
    confidence: float
    recommendations: List[str]
    timestamp: str

class FocusAnalysis(BaseModel):
    daily_average: float
    weekly_trend: List[float]
    peak_hours: List[str]
    improvement_areas: List[str]

class UserProfile(BaseModel):
    user_id: str
    name: str
    age: int
    gender: str
    height: float
    weight: float
    activity_goal: int

# 임시 데이터 저장소 (실제로는 데이터베이스 사용)
user_profiles = {}
biometric_data = {}
focus_predictions = {}

# 응답 모델 정의
class ConcentrationPredictionResponse(BaseModel):
    concentration_score: float
    recommendations: List[str]

# 요청 모델 정의 (기존 필드 유지)
class ConcentrationPredictionRequest(BaseModel):
    user_id: str
    date: str
    heart_rate_avg: float
    heart_rate_resting: float
    sleep_duration: float
    sleep_quality: float
    steps_count: int
    active_calories: float
    stress_level: float = None
    activity_level: float = None
    caffeine_intake: float = None
    water_intake: float = None

@router.post("/predict/concentration", response_model=ConcentrationPredictionResponse)
async def predict_concentration(data: ConcentrationPredictionRequest):
    try:
        logger.info(f"[predict/concentration] 요청: {data}")
        
        # 건강 데이터 형식 변환
        health_data = [{
            'heart_rate': data.heart_rate_avg,
            'sleep_hours': data.sleep_duration,
            'steps': data.steps_count,
            'stress_level': data.stress_level if data.stress_level is not None else 5,
        }]
        
        # 모델로 예측
        model = ConcentrationModel()
        predictions = model.predict_concentration(health_data)
        
        # 단일 점수로 변환 (첫 번째 예측값 사용)
        concentration_score = predictions[0] if predictions else 0.5
        
        # 추천사항 생성
        recommendations = model._generate_recommendations(concentration_score, health_data)
        
        # 응답 객체 반환
        response = {
            "concentration_score": concentration_score,
            "recommendations": recommendations
        }
        
        logger.info(f"[predict/concentration] 응답: {response}")
        return response
        
    except Exception as e:
        logger.error(f"집중도 예측 중 오류 발생: {str(e)}")
        logger.exception("상세 오류 정보:")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/health-metrics")
async def save_health_metrics(data: BiometricData):
    """생체 데이터 저장"""
    try:
        if data.user_id not in biometric_data:
            biometric_data[data.user_id] = []
        biometric_data[data.user_id].append(data)
        return {"status": "success", "message": "Health metrics saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{user_id}/focus-pattern", response_model=FocusAnalysis)
async def get_focus_pattern(user_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None):
    """사용자의 집중력 패턴 분석"""
    try:
        # 요청 로깅 추가
        logger.info(f"focus-pattern 요청: user_id={user_id}, start_date={start_date}, end_date={end_date}")
        
        # 임시 데이터 반환
        return FocusAnalysis(
            daily_average=75.5,
            weekly_trend=[70, 72, 75, 73, 78, 76, 74],
            peak_hours=["09:00", "14:00", "16:00"],
            improvement_areas=["수면 시간", "스트레스 관리"]
        )
    except Exception as e:
        logger.error(f"focus-pattern 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{user_id}/profile", response_model=UserProfile)
async def get_user_profile(user_id: str):
    """사용자 프로필 조회"""
    try:
        if user_id not in user_profiles:
            # 임시 프로필 생성
            user_profiles[user_id] = UserProfile(
                user_id=user_id,
                name="Test User",
                age=30,
                gender="male",
                height=175.0,
                weight=70.0,
                activity_goal=10000
            )
        return user_profiles[user_id]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/status")
async def status():
    """서버 상태 확인"""
    return {"status": "ok", "version": "1.0.0"}

# 에러 핸들러 수정
@app.middleware("http")
async def error_handler(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        logger.error(f"Unhandled exception: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "서버 내부 오류가 발생했습니다."}
        )

# 서버 실행 설정을 도커 환경에 맞게 수정
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)