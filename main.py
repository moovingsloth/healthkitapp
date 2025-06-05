from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uvicorn

app = FastAPI(title="HealthKit Focus Analysis API")

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

@app.post("/predict/concentration", response_model=ConcentrationPrediction)
async def predict_concentration(data: BiometricData):
    """생체 데이터를 기반으로 집중력 예측"""
    try:
        # 간단한 휴리스틱 기반 예측
        score = calculate_concentration_score(data)
        recommendations = generate_recommendations(data, score)
        
        prediction = ConcentrationPrediction(
            concentration_score=score,
            confidence=0.8,
            recommendations=recommendations,
            timestamp=datetime.now().isoformat()
        )
        
        # 예측 결과 저장
        focus_predictions[data.user_id] = prediction
        
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/health-metrics")
async def save_health_metrics(data: BiometricData):
    """생체 데이터 저장"""
    try:
        if data.user_id not in biometric_data:
            biometric_data[data.user_id] = []
        biometric_data[data.user_id].append(data)
        return {"status": "success", "message": "Health metrics saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user/{user_id}/focus-pattern", response_model=FocusAnalysis)
async def get_focus_pattern(user_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None):
    """사용자의 집중력 패턴 분석"""
    try:
        # 임시 데이터 반환
        return FocusAnalysis(
            daily_average=75.5,
            weekly_trend=[70, 72, 75, 73, 78, 76, 74],
            peak_hours=["09:00", "14:00", "16:00"],
            improvement_areas=["수면 시간", "스트레스 관리"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user/{user_id}/profile", response_model=UserProfile)
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

def calculate_concentration_score(data: BiometricData) -> float:
    """집중력 점수 계산"""
    score = 70.0  # 기본 점수
    
    # 수면 시간 기반 조정
    if data.sleep_hours < 6:
        score -= 10
    elif data.sleep_hours > 8:
        score -= 5
    
    # 스트레스 레벨 기반 조정
    score -= data.stress_level * 2
    
    # 활동량 기반 조정
    if data.steps < 5000:
        score -= 5
    elif data.steps > 10000:
        score += 5
    
    # 카페인 섭취 기반 조정
    if data.caffeine_intake > 200:
        score -= 5
    
    # 수분 섭취 기반 조정
    if data.water_intake < 1500:
        score -= 5
    
    return max(0, min(100, score))

def generate_recommendations(data: BiometricData, score: float) -> List[str]:
    """개선 추천사항 생성"""
    recommendations = []
    
    if data.sleep_hours < 6:
        recommendations.append("수면 시간을 늘리는 것이 좋습니다.")
    
    if data.stress_level > 5:
        recommendations.append("스트레스 관리가 필요합니다.")
    
    if data.steps < 5000:
        recommendations.append("활동량을 늘리는 것이 좋습니다.")
    
    if data.caffeine_intake > 200:
        recommendations.append("카페인 섭취를 줄이는 것이 좋습니다.")
    
    if data.water_intake < 1500:
        recommendations.append("수분 섭취를 늘리는 것이 좋습니다.")
    
    if score < 60:
        recommendations.append("전반적인 건강 관리가 필요합니다.")
    
    return recommendations

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True) 