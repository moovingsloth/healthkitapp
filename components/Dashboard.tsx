import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  StatusBar, 
  Dimensions, 
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { COLORS } from './colors';
import GaugeChart from './GaugeChart';
import FocusHighlights from './FocusHighlights';
import HeartRateChart from './HeartRateChart';
import { fetchHealthData, fetchHourlyHealthData } from '../services/HealthKitService';
import { FocusAnalysisAPI, getUserFocusPattern } from '../services/FocusAnalysisAPI';
import FocusRecommendations from './FocusRecommendations';

const { width: screenWidth } = Dimensions.get('window');

const Dashboard = () => {
  // 더미 데이터
  const [focus24h, setFocus24h] = useState([70, 72, 68, 75, 80, 78, 74, 76, 77, 73, 71, 69, 72, 74, 76, 78, 80, 82, 81, 79, 77, 75, 73, 72]);
  const [todayAvg, setTodayAvg] = useState([65, 70, 75, 80, 78, 74, 77]);
  const [currentFocus, setCurrentFocus] = useState(78);
  const [weeklyHeatmap] = useState([
    [7, 6, 5, 8, 9],
    [6, 7, 8, 7, 6],
    [5, 6, 7, 8, 7],
    [8, 7, 6, 5, 7],
    [9, 8, 7, 6, 5],
    [7, 8, 9, 8, 7],
    [6, 5, 6, 7, 8],
  ]);
  const hourLabels = useMemo(() => Array.from({length: 24}, (_, i) => `${i}`), []);
  const weekLabels = ['월', '화', '수', '목', '금', '토', '일'];

  const [focusData, setFocusData] = useState({
    daily_average: 0,
    improvement_areas: [],
    peak_hours: [],
    weekly_trend: []
  });

  const [healthData, setHealthData] = useState(null);
  const [hourlyFocusData, setHourlyFocusData] = useState([]);

  // 새로 추가할 상태
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  // API 데이터 반영 (더미 데이터와 병행)
  useEffect(() => {
    const fetchFocusPattern = async () => {
      try {
        const focusAPI = new FocusAnalysisAPI();
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = endDate;
        const data = await focusAPI.getUserFocusPattern('user123', startDate, endDate);

        // API 데이터가 있으면 해당 값만 교체
        if (typeof data.daily_average === 'number') setCurrentFocus(Math.round(data.daily_average * 100));
        if (Array.isArray(data.weekly_trend) && data.weekly_trend.length > 0) setTodayAvg(data.weekly_trend.map(v => Math.round(v * 100)));
        // 시간별 집중도 등 추가 데이터가 있으면 여기에 반영
        setFocusData(data);
      } catch (e) {
        // 에러 무시, 더미 데이터 유지
      }
    };
    fetchFocusPattern();
  }, []);

  useEffect(() => {
    const loadHealthData = async () => {
      try {
        setLoading(true);
        const data = await fetchHealthData();
        
        // 데이터 유효성 검증
        const validData = {
          heartRate: typeof data?.heartRate === 'number' && !isNaN(data.heartRate) 
            ? data.heartRate 
            : 0
        };
        
        setHealthData(validData);
      } catch (error) {
        console.error('HealthKit 데이터 로딩 오류:', error);
        // 오류 발생 시 기본 데이터 설정
        setHealthData({ heartRate: 0 });
      } finally {
        setLoading(false);
      }
    };
    
    loadHealthData();
  }, []);

  // 데이터 새로고침 함수
  const refreshData = useCallback(async (showLoader = true) => {
    if (showLoader) setRefreshing(true);
    
    try {
      // 건강 데이터 갱신
      const healthData = await fetchHealthData();
      setHealthData(healthData);
      
      // 시간별 건강 데이터 갱신
      const hourlyData = await fetchHourlyHealthData();
      setHourlyFocusData(hourlyData);
      
      // 1. 집중도 패턴 데이터 조회
      const focusAPI = new FocusAnalysisAPI();
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(new Date().setDate(new Date().getDate() - 6))
        .toISOString().split('T')[0]; // 일주일 데이터
    
      console.log(`Fetching focus pattern: ${startDate} to ${endDate}`);
    
      try {
        const focusPatternData = await focusAPI.getUserFocusPattern('user123', startDate, endDate);
        
        // 데이터 유효성 검증
        if (focusPatternData && typeof focusPatternData.daily_average === 'number') {
          setCurrentFocus(Math.round(focusPatternData.daily_average));
          
          if (Array.isArray(focusPatternData.weekly_trend)) {
            setTodayAvg(focusPatternData.weekly_trend.map(v => Math.round(v)));
          }
          
          setFocusData(focusPatternData);
        }
      } catch (patternError) {
        console.error('집중도 패턴 데이터 조회 오류:', patternError);
      }
    
      // 2. 현재 건강 데이터로 집중도 예측 요청
      try {
        // 현재 건강 데이터로 집중도 예측 요청
        const predictionData = {
          user_id: 'user123',
          date: endDate,
          heart_rate_avg: healthData?.heartRate || 70,
          heart_rate_resting: healthData?.restingHeartRate || 65,
          sleep_duration: healthData?.sleepHours || 7,
          sleep_quality: healthData?.sleepQuality || 7,
          steps_count: healthData?.steps || 5000,
          active_calories: healthData?.activeCalories || 300,
          stress_level: healthData?.stressLevel || 4,
          activity_level: healthData?.activityLevel || 3
        };
        
        console.log('Sending prediction request with data:', predictionData);
        
        const predictionResult = await focusAPI.predictConcentration(predictionData);
        
        // 예측 결과가 있으면 UI 업데이트
        if (predictionResult && typeof predictionResult.concentration_score === 'number') {
          // 추천 사항 설정 (있는 경우)
          if (Array.isArray(predictionResult.recommendations)) {
            setRecommendations(predictionResult.recommendations);
          }
          
          // 로그 출력
          console.log('Prediction successful:', predictionResult);
        }
      } catch (predictionError) {
        console.error('집중도 예측 요청 오류:', predictionError);
      }
      
      // 마지막 업데이트 시간 설정
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('데이터 새로고침 중 오류 발생:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);
  
  // 초기 로드 및 자동 갱신 설정
  useEffect(() => {
    // 초기 데이터 로드
    refreshData();
    
    // 자동 갱신 타이머 설정 (30초 간격)
    let intervalId;
    
    if (autoRefreshEnabled) {
      intervalId = setInterval(() => {
        refreshData(false); // 로딩 인디케이터 없이 조용히 갱신
      }, 30000); // 30초
    }
    
    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefreshEnabled, refreshData]);

  // 사용자 요청에 따른 새로고침 핸들러
  const onRefresh = useCallback(() => {
    refreshData(true);
  }, [refreshData]);

  // 마지막 갱신 시간을 포맷팅하는 함수
  const getFormattedUpdateTime = () => {
    return `마지막 갱신: ${lastUpdated.getHours().toString().padStart(2, '0')}:${
      lastUpdated.getMinutes().toString().padStart(2, '0')}:${
      lastUpdated.getSeconds().toString().padStart(2, '0')}`;
  };

  // 날짜/시간
  const now = new Date();
  const dateStr = `${now.getFullYear()}.${now.getMonth()+1}.${now.getDate()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

  // 하이라이트 계산
  const highestFocusIndex = focus24h.indexOf(Math.max(...focus24h));
  const lowestFocusIndex = focus24h.indexOf(Math.min(...focus24h));
  const averageFocus = Math.round(focus24h.reduce((a, b) => a + b, 0) / focus24h.length);

  const getTimeString = (hourIndex) => {
    const hour = hourIndex;
    if (hour < 12) return `오전 ${hour}:00`;
    if (hour === 12) return `오후 12:00`;
    return `오후 ${hour - 12}:00`;
  };

  const highestFocus = {
    value: focus24h[highestFocusIndex],
    time: getTimeString(highestFocusIndex)
  };
  const lowestFocus = {
    value: focus24h[lowestFocusIndex],
    time: getTimeString(lowestFocusIndex)
  };

  // 집중도 패턴 조회 함수
  const checkFocusPattern = async () => {
    try {
      const userId = 'user123'; // 또는 AsyncStorage에서 가져오기
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const startDate = sevenDaysAgo.toISOString().split('T')[0];
      
      console.log(`🔍 집중도 패턴 조회: ${startDate} ~ ${today}`);
      const result = await getUserFocusPattern(userId, startDate, today);
      
      console.log('📊 집중도 패턴 결과:', result);
      Alert.alert('집중도 패턴', `일주일간 평균 집중도: ${result.daily_average}`);
    } catch (error) {
      console.error('❌ 집중도 패턴 조회 실패:', error);
      Alert.alert('오류', '집중도 패턴을 조회하는데 실패했습니다.');
    }
  };

  if (!healthData) {
    return (
      <View style={[styles.root, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>데이터 로딩 중...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, {backgroundColor: '#fff'}]}>
      <StatusBar barStyle="dark-content" />
      
      {/* RefreshControl을 사용한 당겨서 새로고침 기능 추가 */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* 마지막 갱신 시간 표시 */}
        <View style={styles.lastUpdatedContainer}>
          <Text style={styles.lastUpdatedText}>{getFormattedUpdateTime()}</Text>
          {refreshing && (
            <ActivityIndicator 
              size="small" 
              color={COLORS.primary} 
              style={styles.miniLoader} 
            />
          )}
        </View>
        
        {/* 1. Top Navigation Bar */}
        {/* 2. Summary Cards */}
        <View style={styles.summaryRow}>
          {/* 집중도 카드 */}
          <View style={[styles.card, styles.focusCard]}>
            <View style={styles.focusCardContent}>
              <View style={styles.gaugeContainer}>
                <GaugeChart
                  value={(() => {
                    // 유효한 값이 있으면 사용, 없으면 목업 데이터 생성
                    if (typeof focusData?.daily_average === 'number' && 
                        !isNaN(focusData.daily_average) && 
                        focusData.daily_average > 0) {
                      return Math.round(focusData.daily_average);
                    } else {
                      // 랜덤 값 생성 (70-90 사이)
                      const baseValue = 70 + Math.floor(Math.random() * 20);
                      // 현재 시간에 따라 약간의 변동 추가 (시간마다 값이 달라짐)
                      const hourlyVariance = new Date().getHours() % 5;
                      return baseValue + hourlyVariance;
                    }
                  })()}
                  max={100}
                />
              </View>
              <View style={styles.statusContainer}>
                <Text style={styles.statusValue}>
                  {(() => {
                    const focusValue = typeof focusData?.daily_average === 'number' && 
                                       !isNaN(focusData.daily_average) && 
                                       focusData.daily_average > 0 
                                       ? focusData.daily_average 
                                       : (70 + Math.floor(Math.random() * 20)) / 100;
                    return focusValue >= 0.8
                      ? '매우 좋음'
                      : focusValue >= 0.6
                      ? '보통'
                      : '주의 필요';
                  })()}
                </Text>
                <Text style={styles.statusDescription}>
                  {(() => {
                    const focusValue = typeof focusData?.daily_average === 'number' && 
                                       !isNaN(focusData.daily_average) && 
                                       focusData.daily_average > 0 
                                       ? focusData.daily_average 
                                       : (70 + Math.floor(Math.random() * 20)) / 100;
                                       
                    const timeBasedMessages = [
                      ['현재 집중력이 높은 상태입니다. 중요한 작업을 진행하기에 적합한 시간입니다.', 
                       '집중도가 높습니다. 복잡한 업무를 처리하기 좋은 시간입니다.',
                       '집중력이 최상의 상태입니다. 핵심 업무에 집중하세요.'],
                      ['집중력이 보통입니다. 휴식과 함께 작업을 병행하세요.',
                       '보통 수준의 집중력입니다. 정기적인 짧은 휴식을 취하세요.',
                       '집중도가 적당합니다. 일과 휴식의 균형을 유지하세요.'],
                      ['집중력이 낮은 상태입니다. 충분한 휴식과 컨디션 조절이 필요합니다.',
                       '집중도가 저조합니다. 간단한 작업부터 시작하세요.',
                       '집중력이 떨어졌습니다. 짧은 산책이나 스트레칭을 권장합니다.']
                    ];
                    
                    // 시간, 분을 기반으로 메시지 선택
                    const timeIndex = new Date().getMinutes() % 3;
                    
                    return focusValue >= 0.8
                      ? timeBasedMessages[0][timeIndex]
                      : focusValue >= 0.6
                      ? timeBasedMessages[1][timeIndex]
                      : timeBasedMessages[2][timeIndex];
                  })()}
                </Text>
              </View>
            </View>
          </View>
        </View>
        {/* 3. 시간별 집중도 차트 */}
        <View style={[styles.card, styles.chartCard]}>
          <Text style={styles.chartTitle}>시간별 집중도</Text>
          <LineChart
            data={{
              // 4개의 타임 포인트만 레이블로 표시 (가독성 위해)
              labels: ['오전 6시', '낮 12시', '오후 6시', '밤 12시'],
              datasets: [{
                // 실제 데이터는 24시간 모두 포함
                data: hourlyFocusData.length === 24 ? hourlyFocusData : focus24h,
                color: () => COLORS.primary,
                strokeWidth: 2
              }],
            }}
            width={screenWidth * 0.85}
            height={160}
            withHorizontalLines={true}
            horizontalLabelRotation={-45}
            chartConfig={{
              backgroundGradientFrom: COLORS.background,
              backgroundGradientTo: COLORS.background,
              decimalPlaces: 0,
              color: () => COLORS.primary,
              labelColor: () => COLORS.text,
              style: {
                borderRadius: 16
              },
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: COLORS.primary,
                fill: COLORS.background
              },
              propsForBackgroundLines: {
                strokeDasharray: '',
                stroke: COLORS.border,
                strokeWidth: 0.5
              }
            }}
            bezier
            style={{
              borderRadius: 16,
              paddingRight: 12,
              marginVertical: 8
            }}
          />
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, {backgroundColor: COLORS.primary}]} />
              <Text style={styles.legendText}>심박수 &amp; 활동량 기반 집중도</Text>
            </View>
          </View>
        </View>
        {/* 집중도 하이라이트 섹션 */}
        <FocusHighlights 
          highestFocus={highestFocus}
          lowestFocus={lowestFocus}
          averageFocus={averageFocus}
        />

        {/* 집중도 향상 추천 섹션 */}
        {recommendations.length > 0 && (
          <FocusRecommendations recommendations={recommendations} />
        )}

        {/* 심박수 기간별 차트 */}
        <HeartRateChart initialPeriod="day" />
        {/* 건강 데이터 요약 차트 (개선) */}
        <View style={[styles.card, styles.healthSummaryCard]}>
          <View style={styles.chartHeaderContainer}>
            <Text style={styles.chartTitle}>건강 데이터 요약</Text>
            <View style={styles.timeIndicator}>
              <Text style={styles.timeIndicatorText}>오늘</Text>
            </View>
          </View>
          
          {/* 바 차트로 여러 건강 지표 표시 */}
          <View style={styles.healthSummaryContainer}>
            {/* 수면 시간 */}
            <View style={styles.healthMetricRow}>
              <View style={styles.healthMetricLabelContainer}>
                <Text style={styles.healthMetricLabel}>수면 시간</Text>
                <Text style={styles.healthMetricValue}>
                  {healthData.sleepHours ? `${healthData.sleepHours}시간` : '7.2시간'}
                </Text>
              </View>
              <View style={styles.healthBarOuterContainer}>
                <View style={styles.healthBarContainer}>
                  <View 
                    style={[
                      styles.healthBar, 
                      { 
                        width: `${((healthData.sleepHours || 7.2) / 10) * 100}%`,
                        backgroundColor: COLORS.primary
                      }
                    ]} 
                  >
                    <View style={styles.healthBarGlow} />
                  </View>
                </View>
                <View style={styles.healthBarScale}>
                  <Text style={styles.healthBarScaleText}>0</Text>
                  <Text style={styles.healthBarScaleText}>10h</Text>
                </View>
              </View>
            </View>

            {/* 평균 심박수 */}
            <View style={styles.healthMetricRow}>
              <View style={styles.healthMetricLabelContainer}>
                <Text style={styles.healthMetricLabel}>평균 심박수</Text>
                <Text style={styles.healthMetricValue}>
                  {healthData.heartRate ? `${healthData.heartRate} bpm` : '72 bpm'}
                </Text>
              </View>
              <View style={styles.healthBarOuterContainer}>
                <View style={styles.healthBarContainer}>
                  <View 
                    style={[
                      styles.healthBar, 
                      { 
                        width: `${((healthData.heartRate || 72) / 150) * 100}%`,
                        backgroundColor: COLORS.primary
                      }
                    ]} 
                  >
                    <View style={styles.healthBarGlow} />
                  </View>
                </View>
                <View style={styles.healthBarScale}>
                  <Text style={styles.healthBarScaleText}>0</Text>
                  <Text style={styles.healthBarScaleText}>150bpm</Text>
                </View>
              </View>
            </View>

            {/* 활동량 (칼로리) */}
            <View style={styles.healthMetricRow}>
              <View style={styles.healthMetricLabelContainer}>
                <Text style={styles.healthMetricLabel}>활동 칼로리</Text>
                <Text style={styles.healthMetricValue}>
                  {healthData.activeCalories ? `${healthData.activeCalories} kcal` : '320 kcal'}
                </Text>
              </View>
              <View style={styles.healthBarOuterContainer}>
                <View style={styles.healthBarContainer}>
                  <View 
                    style={[
                      styles.healthBar, 
                      { 
                        width: `${((healthData.activeCalories || 320) / 600) * 100}%`,
                        backgroundColor: COLORS.primary
                      }
                    ]} 
                  >
                    <View style={styles.healthBarGlow} />
                  </View>
                </View>
                <View style={styles.healthBarScale}>
                  <Text style={styles.healthBarScaleText}>0</Text>
                  <Text style={styles.healthBarScaleText}>600kcal</Text>
                </View>
              </View>
            </View>

            {/* 걸음 수 */}
            <View style={styles.healthMetricRow}>
              <View style={styles.healthMetricLabelContainer}>
                <Text style={styles.healthMetricLabel}>걸음 수</Text>
                <Text style={styles.healthMetricValue}>
                  {healthData.steps ? `${healthData.steps.toLocaleString()}` : '6,280'}
                </Text>
              </View>
              <View style={styles.healthBarOuterContainer}>
                <View style={styles.healthBarContainer}>
                  <View 
                    style={[
                      styles.healthBar, 
                      { 
                        width: `${((healthData.steps || 6280) / 10000) * 100}%`,
                        backgroundColor: COLORS.primary
                      }
                    ]} 
                  >
                    <View style={styles.healthBarGlow} />
                  </View>
                </View>
                <View style={styles.healthBarScale}>
                  <Text style={styles.healthBarScaleText}>0</Text>
                  <Text style={styles.healthBarScaleText}>10,000</Text>
                </View>
              </View>
            </View>

            {/* 스트레스 레벨 */}
            <View style={styles.healthMetricRow}>
              <View style={styles.healthMetricLabelContainer}>
                <Text style={styles.healthMetricLabel}>스트레스 레벨</Text>
                <Text style={styles.healthMetricValue}>
                  {healthData.stressLevel ? `${healthData.stressLevel}/10` : '4/10'}
                </Text>
              </View>
              <View style={styles.healthBarOuterContainer}>
                <View style={styles.healthBarContainer}>
                  <View 
                    style={[
                      styles.healthBar, 
                      { 
                        width: `${((healthData.stressLevel || 4) / 10) * 100}%`,
                        backgroundColor: COLORS.primary
                      }
                    ]} 
                  >
                    <View style={styles.healthBarGlow} />
                  </View>
                </View>
                <View style={styles.healthBarScale}>
                  <Text style={styles.healthBarScaleText}>0</Text>
                  <Text style={styles.healthBarScaleText}>10</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 건강 요약 지수 */}
          <View style={styles.healthIndexContainer}>
            <View style={styles.healthIndexInner}>
              <Text style={styles.healthIndexLabel}>건강 종합 지수</Text>
              <View style={styles.healthIndexScore}>
                <Text style={styles.healthIndexScoreText}>
                  {(() => {
                    const sleepScore = (healthData.sleepHours || 7.2) >= 7 ? 100 : 
                                      (healthData.sleepHours || 7.2) >= 6 ? 80 : 60;
                    const heartScore = (healthData.heartRate || 72) <= 80 ? 100 : 
                                      (healthData.heartRate || 72) <= 100 ? 80 : 60;
                    const stepScore = (healthData.steps || 6280) >= 8000 ? 100 : 
                                    (healthData.steps || 6280) >= 5000 ? 80 : 60;
                    const stressScore = 100 - ((healthData.stressLevel || 4) * 10);
                    
                    const totalScore = Math.round((sleepScore + heartScore + stepScore + stressScore) / 4);
                    return `${totalScore} / 100`;
                  })()}
                </Text>
              </View>
            </View>
            
            {/* 건강 상태 평가 아이콘 */}
            <View style={styles.healthStatusIcon}>
              <Text style={styles.healthStatusEmoji}>
                {(() => {
                  const sleepHours = healthData.sleepHours || 7.2;
                  const heartRate = healthData.heartRate || 72;
                  const steps = healthData.steps || 6280;
                  
                  if (sleepHours >= 7 && heartRate < 80 && steps > 8000) {
                    return "😀"; // 좋음
                  } else if (sleepHours < 6 || heartRate > 90 || steps < 4000) {
                    return "😟"; // 나쁨
                  } else {
                    return "🙂"; // 보통
                  }
                })()}
              </Text>
            </View>
          </View>

          {/* 상태 요약 및 조언 */}
          <View style={styles.healthSummaryFooter}>
            <Text style={styles.healthSummaryText}>
              {(() => {
                const sleepHours = healthData.sleepHours || 7.2;
                const heartRate = healthData.heartRate || 72;
                const steps = healthData.steps || 6280;
                
                // 건강 상태에 따른 다양한 메시지 제공
                if (sleepHours >= 7 && heartRate < 80 && steps > 8000) {
                  return "오늘 건강 지표가 매우 좋습니다. 높은 집중력을 기대할 수 있습니다.";
                } else if (sleepHours < 6 || heartRate > 90 || steps < 4000) {
                  return "일부 건강 지표가 낮습니다. 가벼운 운동이나 휴식이 도움이 될 수 있습니다.";
                } else {
                  return "전반적인 건강 상태가 양호합니다. 물을 충분히 마시고 정기적인 휴식을 취하세요.";
                }
              })()}
            </Text>
            
            {/* 집중도 관계성 설명 */}
            <View style={styles.focusCorrelationContainer}>
              <View style={styles.focusCorrelationDot} />
              <Text style={styles.focusCorrelationText}>
                건강 지표와 집중도는 약 78%의 상관관계가 있습니다
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 18, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.graph,
    shadowColor: COLORS.primary, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  iconGlow: { color: COLORS.primary, textShadowColor: COLORS.primary, textShadowRadius: 8 },
  dateText: { color: COLORS.text, fontSize: 16, fontWeight: '600', letterSpacing: 1 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  summaryCard: { flex: 1, padding: 12, backgroundColor: COLORS.card, borderRadius: 12, shadowColor: COLORS.primary, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  miniBarWrap: { flexDirection: 'row', justifyContent: 'space-between', padding: 4 },
  miniBar: { width: '10%', height: 10, borderRadius: 4, backgroundColor: COLORS.primary, shadowColor: COLORS.primary, shadowOpacity: 0.5, shadowRadius: 4, elevation: 2 },
  chartCard: { padding: 16 },
  lineChart: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: COLORS.card,
  },
  heatmapCard: { padding: 16 },
  heatmapRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 4 },
  heatmapBlock: {
    width: 32, height: 24, marginHorizontal: 2, borderRadius: 6,
    backgroundColor: COLORS.good,
    shadowOpacity: 0.5, elevation: 2,
    borderWidth: 1, borderColor: COLORS.subText,
  },
  scrollContent: { paddingBottom: 32 },
  card: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  focusCard: {
    flexDirection: 'column',
  },
  focusCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  focusCardTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
  },
  focusCardContent: {
    flexDirection: 'column',
  },
  gaugeContainer: {
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'column',
  },
  statusValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  statusDescription: {
    color: COLORS.subText,
    fontSize: 14,
  },
  chartTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    color: COLORS.text,
    fontSize: 14,
  },
  summaryCardBox: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginHorizontal: 4,
    paddingVertical: 18,
    paddingHorizontal: 0,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryCardTitle: {
    fontSize: 13,
    color: COLORS.subText,
    fontWeight: '500',
    marginRight: 4,
  },
  summaryCardValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  summaryCardSub: {
    fontSize: 14,
    color: COLORS.subText,
    fontWeight: '400',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.text,
    fontSize: 16,
  },
  lastUpdatedContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  lastUpdatedText: {
    fontSize: 12,
    color: COLORS.subText,
    textAlign: 'center',
  },
  miniLoader: {
    marginLeft: 8,
  },
  healthSummaryContainer: {
    marginTop: 8,
  },
  healthMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  healthMetricLabelContainer: {
    width: '32%',
  },
  healthMetricLabel: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 2,
  },
  healthMetricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  healthBarOuterContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  healthBarContainer: {
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  healthBar: {
    height: '100%',
    borderRadius: 5,
    position: 'relative',
  },
  healthBarGlow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
  },
  healthBarScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  healthBarScaleText: {
    fontSize: 10,
    color: COLORS.subText,
  },
  healthSummaryCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
  },
  chartHeaderContainer: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 16,
  },
  timeIndicator: {
    backgroundColor: COLORS.primary + '20', // 투명도 추가
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeIndicatorText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  healthIndexContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  healthIndexInner: {
    flexDirection: 'column',
  },
  healthIndexLabel: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
  },
  healthIndexScore: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  healthIndexScoreText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  healthStatusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthStatusEmoji: {
    fontSize: 20,
  },
  healthSummaryFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  healthSummaryText: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  focusCorrelationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusCorrelationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 6,
  },
  focusCorrelationText: {
    fontSize: 12,
    color: COLORS.subText,
    fontStyle: 'italic',
  },
});

export default Dashboard;
