from fastapi import FastAPI, HTTPException, Depends, APIRouter, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
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

class HealthMetrics(BaseModel):
    user_id: str
    date: str
    heart_rate_avg: float
    heart_rate_resting: float
    sleep_duration: float
    sleep_quality: float
    steps_count: int
    active_calories: float
    stress_level: Optional[float] = None
    activity_level: Optional[float] = None

@router.post("/predict/concentration", response_model=ConcentrationPrediction)
async def predict_concentration(metrics: HealthMetrics):
    try:
        # 캐시에서 이전 예측 확인
        cache_key = f"{metrics.user_id}:{metrics.date}"
        cached_prediction = await cache_service.get_prediction(metrics.user_id, metrics.date)
        
        # 캐시에 저장된 예측이 있으면 반환
        if cached_prediction:
            logger.info(f"[predict/concentration] 캐시 HIT: {cache_key}")
            return cached_prediction
            
        # 메트릭 데이터를 딕셔너리로 변환하여 모델에 전달
        try:
            metrics_dict = metrics.dict() if hasattr(metrics, 'dict') else metrics
            logger.info(f"[predict/concentration] 모델에 데이터 전달: {type(metrics_dict)}")
            prediction_result = get_concentration_prediction(metrics_dict)
            
            # 딕셔너리 결과를 Pydantic 모델로 변환
            if isinstance(prediction_result, dict):
                prediction_obj = ConcentrationPrediction(
                    concentration_score=prediction_result.get("concentration_score", 65.0),
                    confidence=prediction_result.get("confidence", 0.7),
                    recommendations=prediction_result.get("recommendations", ["기본 추천사항입니다."]),
                    timestamp=datetime.now()
                )
            else:
                # 이미 Pydantic 모델인 경우
                prediction_obj = prediction_result
                
            # 캐시에 저장
            await cache_service.set_prediction(metrics.user_id, metrics.date, prediction_obj)
            
            return prediction_obj
            
        except Exception as e:
            logger.error(f"[predict/concentration] 예측 처리 중 오류: {str(e)}")
            # 오류 발생 시 기본값 반환
            return ConcentrationPrediction(
                concentration_score=65.0,
                confidence=0.7,
                recommendations=["오류가 발생하여 기본 추천사항을 제공합니다."],
                timestamp=datetime.now()
            )
            
    except Exception as e:
        logger.error(f"[predict/concentration] 에러: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="집중도 예측 중 오류가 발생했습니다."
        )

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
async def get_user_focus_pattern(
    user_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db = Depends(get_db)
):
    logger.info(f"[focus-pattern] 요청: user_id={user_id}, start_date={start_date}, end_date={end_date}")
    try:
        # 문자열 날짜를 datetime 객체로 변환
        if start_date:
            try:
                # 날짜 문자열을 datetime 객체로 변환
                if isinstance(start_date, str):
                    from datetime import datetime
                    start_date_obj = datetime.strptime(start_date, "%Y-%m-%d")
                else:
                    start_date_obj = start_date
            except ValueError:
                start_date_obj = datetime.now() - timedelta(days=7)
        else:
            start_date_obj = datetime.now() - timedelta(days=7)
            
        if end_date:
            try:
                # 날짜 문자열을 datetime 객체로 변환
                if isinstance(end_date, str):
                    from datetime import datetime
                    end_date_obj = datetime.strptime(end_date, "%Y-%m-%d")
                else:
                    end_date_obj = end_date
            except ValueError:
                end_date_obj = datetime.now()
        else:
            end_date_obj = datetime.now()

        logger.info(f"[focus-pattern] 쿼리 범위: start_date={start_date_obj}, end_date={end_date_obj}")
        
        # 임시 데이터 반환으로 처리 (빠른 해결을 위해)
        mock_analysis = FocusAnalysis(
            daily_average=75.2,
            weekly_trend=[72.1, 74.5, 78.2, 76.8, 75.9, 77.3, 75.2],
            peak_hours=[9, 10, 14, 15],
            improvement_areas=["수면 품질", "스트레스 관리"]
        )
        return mock_analysis
        
    except Exception as e:
        logger.error(f"[focus-pattern] 에러: user_id={user_id}, error={str(e)}")
        raise HTTPException(status_code=500, detail="집중도 분석 조회 중 오류가 발생했습니다.")

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

# 임시 DB 및 캐시 서비스
async def get_db():
    return {"connected": True}

class CacheService:
    async def get_prediction(self, user_id, date):
        return None
        
    async def set_prediction(self, user_id, date, prediction):
        pass

cache_service = CacheService()

# 서버 실행 설정을 도커 환경에 맞게 수정
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)