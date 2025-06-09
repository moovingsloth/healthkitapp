import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { getUserFocusPattern, predictConcentration, saveHealthData } from '../services/FocusAnalysisAPI';

interface BiometricData {
  user_id: string;
  date: string;
  heart_rate_avg: number;
  heart_rate_resting: number;
  sleep_duration: number;
  sleep_quality: number;
  steps_count: number;
  active_calories: number;
  stress_level: number;
  activity_level: number;
}

interface ConcentrationPrediction {
  concentration_score: number;
  confidence: number;
  timestamp: string;
  recommendations: string[];
}

interface ConcentrationPredictorProps {
  biometricData: BiometricData;
  userId: string;
}

const ConcentrationPredictor: React.FC<ConcentrationPredictorProps> = ({ biometricData, userId }) => {
  const [prediction, setPrediction] = useState<ConcentrationPrediction | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);

  // 유틸리티 함수: 지정된 시간(ms) 동안 대기
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // 집중도 예측 요청
  const requestPrediction = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 1. 먼저 건강 데이터 저장
      const predictionData = {
        ...biometricData,
        user_id: userId,
      };

      try {
        console.log('서버에 건강 데이터 저장 중:', predictionData);
        await saveHealthData(predictionData);  // 이 함수가 실행되고 있는지 확인
        console.log('건강 데이터 저장 완료');
        
        // 서버에서 데이터를 처리할 시간 제공 (1초 대기)
        await sleep(1000);
      } catch (saveError) {
        console.error('건강 데이터 저장 실패:', saveError);
        // 저장 실패해도 예측은 시도
      }
      
      // 2. API를 통한 집중도 예측
      console.log('Sending prediction request with data:', predictionData);
      const result = await predictConcentration(predictionData);
      
      // 결과 포맷팅
      const formattedResult: ConcentrationPrediction = {
        concentration_score: result.concentration_score || 65,
        confidence: result.confidence || 0.7,
        timestamp: new Date().toISOString(),
        recommendations: result.recommendations || 
                        [result.recommendation || "더 많은 데이터를 기록하면 더 정확한 예측이 가능합니다."]
      };
      
      setPrediction(formattedResult);
      
      // 3. 집중도 패턴 분석 (건강 데이터 저장 후 호출)
      const today = new Date().toISOString().split('T')[0];
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const startDate = oneWeekAgo.toISOString().split('T')[0];
      const endDate = today;
      
      console.log(`Fetching focus pattern: ${startDate} to ${endDate}`);
      const patternAnalysis = await getUserFocusPattern(userId, startDate, endDate);
      setAnalysis(patternAnalysis);
      
    } catch (err) {
      console.error('집중도 패턴 데이터 조회 오류:', err);
      setError('데이터 분석 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 예측 실행
  useEffect(() => {
    requestPrediction();
  }, [biometricData]);

  // 집중도 점수에 따른 색상 결정
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF50'; // 좋음
    if (score >= 60) return '#FFC107'; // 보통
    if (score >= 40) return '#FF9800'; // 주의
    return '#F44336'; // 나쁨
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>집중도 분석 중...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {prediction && (
        <View style={styles.predictionContainer}>
          <Text style={styles.title}>집중도 예측 결과</Text>
          
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>집중도 점수</Text>
            <Text 
              style={[
                styles.scoreValue, 
                { color: getScoreColor(prediction.concentration_score) }
              ]}
            >
              {prediction.concentration_score.toFixed(1)}
            </Text>
            <Text style={styles.confidenceText}>
              신뢰도: {(prediction.confidence * 100).toFixed(0)}%
            </Text>
          </View>
          
          <View style={styles.recommendationsContainer}>
            <Text style={styles.recommendationsTitle}>추천사항</Text>
            {prediction.recommendations.map((rec: any, index: any) => (
              <Text key={index} style={styles.recommendationItem}>
                • {rec}
              </Text>
            ))}
          </View>
          
          <Text style={styles.timestampText}>
            예측 시간: {new Date(prediction.timestamp).toLocaleString()}
          </Text>
        </View>
      )}
      
      {analysis && (
        <View style={styles.analysisContainer}>
          <Text style={styles.title}>집중도 패턴 분석</Text>
          
          <View style={styles.analysisItem}>
            <Text style={styles.analysisLabel}>일일 평균 집중도</Text>
            <Text style={styles.analysisValue}>
              {analysis.daily_average.toFixed(1)}
            </Text>
          </View>
          
          <View style={styles.analysisItem}>
            <Text style={styles.analysisLabel}>주간 트렌드</Text>
            <View style={styles.trendContainer}>
              {analysis.weekly_trend.map((value: number, index: number) => (
                <View key={index} style={styles.trendBar}>
                  <View 
                    style={[
                      styles.trendBarFill, 
                      { 
                        height: `${value}%`,
                        backgroundColor: getScoreColor(value)
                      }
                    ]} 
                  />
                  <Text style={styles.trendBarLabel}>
                    {['월', '화', '수', '목', '금', '토', '일'][index]}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          
          <View style={styles.analysisItem}>
            <Text style={styles.analysisLabel}>집중도가 높은 시간대</Text>
            <Text style={styles.analysisValue}>
              {analysis.peak_hours.map((hour: number) => `${hour}시`).join(', ')}
            </Text>
          </View>
          
          <View style={styles.analysisItem}>
            <Text style={styles.analysisLabel}>개선이 필요한 영역</Text>
            {analysis.improvement_areas.map((area: string, index: number) => (
              <Text key={index} style={styles.improvementItem}>
                • {area}
              </Text>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    marginTop: 16,
  },
  predictionContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  confidenceText: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  recommendationsContainer: {
    marginBottom: 16,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  recommendationItem: {
    fontSize: 16,
    color: '#444',
    marginBottom: 8,
    lineHeight: 22,
  },
  timestampText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
  },
  analysisContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  analysisItem: {
    marginBottom: 20,
  },
  analysisLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  analysisValue: {
    fontSize: 16,
    color: '#444',
  },
  trendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
    marginTop: 8,
  },
  trendBar: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  trendBarFill: {
    width: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  trendBarLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  improvementItem: {
    fontSize: 16,
    color: '#444',
    marginBottom: 8,
  },
});

export default ConcentrationPredictor;