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
                  value={typeof focusData?.daily_average === 'number' && !isNaN(focusData.daily_average) 
                    ? Math.round(focusData.daily_average * 100) 
                    : 78}
                  max={100}
                />
              </View>
              <View style={styles.statusContainer}>
                <Text style={styles.statusValue}>
                  {focusData.daily_average >= 0.8
                    ? '매우 좋음'
                    : focusData.daily_average >= 0.6
                    ? '보통'
                    : '주의 필요'}
                </Text>
                <Text style={styles.statusDescription}>
                  {focusData.daily_average >= 0.8
                    ? '현재 집중력이 높은 상태입니다. 중요한 작업을 진행하기에 적합한 시간입니다.'
                    : focusData.daily_average >= 0.6
                    ? '집중력이 보통입니다. 휴식과 함께 작업을 병행하세요.'
                    : '집중력이 낮은 상태입니다. 충분한 휴식과 컨디션 조절이 필요합니다.'}
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
        {/* 건강 데이터 요약 차트 (기존) */}
        <View style={[styles.card, styles.chartCard]}>
          <Text style={styles.chartTitle}>건강 데이터 요약</Text>
          <LineChart
            data={{
              labels: ['Heart Rate'],
              datasets: [{ data: [healthData.heartRate || 0] }],
            }}
            width={screenWidth * 0.85}
            height={200}
            yAxisLabel=""
            chartConfig={{
              backgroundColor: '#fff',
              backgroundGradientFrom: '#fff',
              backgroundGradientTo: '#fff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
            }}
            bezier
            style={{ marginVertical: 8, borderRadius: 16 }}
          />
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
});

export default Dashboard;
