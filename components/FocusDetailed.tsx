 import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { LineChart, ContributionGraph, BarChart } from 'react-native-chart-kit';
import { COLORS } from './colors';
import { FocusAnalysisAPI } from '../services/FocusAnalysisAPI';
import Icon from 'react-native-vector-icons/Ionicons';

const { width: screenWidth } = Dimensions.get('window');

const FocusDetailed = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [focusData, setFocusData] = useState({
    daily_average: 0,
    improvement_areas: [],
    peak_hours: [],
    weekly_trend: [],
    monthly_trend: [],
    focus_factors: [],
    focus_forecast: []
  });
  
  // 시간대별 집중도 데이터
  const [hourlyData, setHourlyData] = useState(Array(24).fill(0));
  // 요일별 집중도 데이터
  const [weekdayData, setWeekdayData] = useState([0, 0, 0, 0, 0, 0, 0]);
  // 집중도 영향 요소 데이터
  const [factorData, setFactorData] = useState([]);
  
  // 히트맵 데이터 (월간 집중도)
  const [heatmapData, setHeatmapData] = useState([]);
  
  const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
  
  useEffect(() => {
    const fetchDetailedFocusData = async () => {
      try {
        setLoading(true);
        
        const focusAPI = new FocusAnalysisAPI();
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        // 상세 집중도 데이터 요청
        const data = await focusAPI.getDetailedFocusData('user123', startDate, endDate);
        setFocusData(data);
        
        // 시간대별 집중도 처리
        if (data.hourly_focus && Array.isArray(data.hourly_focus)) {
          setHourlyData(data.hourly_focus);
        } else {
          // 더미 데이터
          setHourlyData([
            45, 40, 35, 30, 25, 30, 40, 55, 
            65, 75, 85, 90, 85, 80, 75, 70, 
            65, 60, 65, 70, 65, 60, 55, 50
          ]);
        }
        
        // 요일별 집중도 처리
        if (data.weekday_focus && Array.isArray(data.weekday_focus)) {
          setWeekdayData(data.weekday_focus);
        } else {
          // 더미 데이터
          setWeekdayData([65, 70, 80, 75, 72, 68, 62]);
        }
        
        // 집중도 영향 요소 처리
        if (data.focus_factors && Array.isArray(data.focus_factors)) {
          setFactorData(data.focus_factors);
        } else {
          // 더미 데이터
          setFactorData([
            { name: '수면', score: 0.85, impact: 0.3 },
            { name: '운동', score: 0.7, impact: 0.2 },
            { name: '스트레스', score: 0.4, impact: -0.25 },
            { name: '카페인', score: 0.6, impact: 0.15 },
            { name: '휴식', score: 0.5, impact: 0.1 }
          ]);
        }
        
        // 히트맵 데이터 처리 (월간 집중도)
        if (data.monthly_trend && Array.isArray(data.monthly_trend)) {
          const heatmapFormat = data.monthly_trend.map((value, index) => {
            const date = new Date();
            date.setDate(date.getDate() - (30 - index));
            return {
              date: date.toISOString().split('T')[0],
              count: Math.round(value * 10)
            };
          });
          setHeatmapData(heatmapFormat);
        } else {
          // 더미 히트맵 데이터
          const heatmapFormat = Array(30).fill(0).map((_, index) => {
            const date = new Date();
            date.setDate(date.getDate() - (30 - index));
            return {
              date: date.toISOString().split('T')[0],
              count: Math.floor(Math.random() * 10) + 1
            };
          });
          setHeatmapData(heatmapFormat);
        }
      } catch (error) {
        console.error('상세 집중도 데이터 로딩 오류:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDetailedFocusData();
  }, []);
  
  // 집중 피크 시간대 포맷팅
  const getPeakHoursFormatted = () => {
    if (focusData.peak_hours && focusData.peak_hours.length > 0) {
      return focusData.peak_hours.map(hour => {
        const time = hour < 12 
          ? `오전 ${hour}시` 
          : hour === 12 
            ? '오후 12시' 
            : `오후 ${hour - 12}시`;
        return time;
      }).join(', ');
    }
    
    // 더미 데이터
    return '오전 10시, 오후 3시';
  };
  
  // 개선 영역 메시지
  const getImprovementMessage = () => {
    if (focusData.improvement_areas && focusData.improvement_areas.length > 0) {
      return focusData.improvement_areas.join('\n');
    }
    
    // 더미 데이터
    return '규칙적인 수면 패턴 유지하기\n적절한 휴식 시간 배분하기';
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>집중도 데이터 분석 중...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>집중도 분석</Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* 집중도 요약 카드 */}
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>집중도 요약</Text>
          <View style={styles.summaryContent}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>오늘 평균</Text>
              <Text style={[
                styles.summaryValue, 
                focusData.daily_average >= 0.8 ? styles.highFocus : 
                focusData.daily_average >= 0.6 ? styles.mediumFocus : styles.lowFocus
              ]}>
                {Math.round(focusData.daily_average * 100)}%
              </Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>집중 피크 시간</Text>
              <Text style={styles.summaryTimeValue}>{getPeakHoursFormatted()}</Text>
            </View>
          </View>
        </View>
        
        {/* 시간별 집중도 추이 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>시간별 집중도 추이</Text>
          <LineChart
            data={{
              labels: ['6시', '9시', '12시', '15시', '18시', '21시'],
              datasets: [{
                data: hourlyData,
                color: () => COLORS.primary,
                strokeWidth: 2
              }]
            }}
            width={screenWidth * 0.9}
            height={180}
            chartConfig={{
              backgroundColor: COLORS.background,
              backgroundGradientFrom: COLORS.background,
              backgroundGradientTo: COLORS.background,
              decimalPlaces: 0,
              color: () => COLORS.primary,
              labelColor: () => COLORS.text,
              propsForDots: {
                r: '3',
                strokeWidth: '2',
                stroke: COLORS.primary
              }
            }}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={false}
          />
          
          <View style={styles.insightContainer}>
            <Icon name="bulb-outline" size={20} color={COLORS.good} style={styles.insightIcon} />
            <Text style={styles.insightText}>
              오전 10-11시와 오후 3-4시에 집중력이 가장 높습니다.
              중요한 업무는 이 시간대에 배치하세요.
            </Text>
          </View>
        </View>
        
        {/* 요일별 집중도 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>요일별 집중도</Text>
          <BarChart
            data={{
              labels: dayLabels,
              datasets: [{
                data: weekdayData
              }]
            }}
            width={screenWidth * 0.9}
            height={180}
            chartConfig={{
              backgroundColor: COLORS.background,
              backgroundGradientFrom: COLORS.background,
              backgroundGradientTo: COLORS.background,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(77, 123, 243, ${opacity})`,
              labelColor: () => COLORS.text,
              barPercentage: 0.7,
            }}
            style={styles.chart}
            withInnerLines={true}
          />
          
          <View style={styles.insightContainer}>
            <Icon name="calendar-outline" size={20} color={COLORS.good} style={styles.insightIcon} />
            <Text style={styles.insightText}>
              화요일에 집중도가 가장 높고, 금요일과 주말에 떨어지는 경향이 있습니다.
              중요한 미팅이나 과제는 화/수요일에 배치하세요.
            </Text>
          </View>
        </View>
        
        {/* 월간 집중도 히트맵 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>월간 집중도 히트맵</Text>
          <ContributionGraph
            values={heatmapData}
            endDate={new Date()}
            numDays={30}
            width={screenWidth * 0.9}
            height={220}
            chartConfig={{
              backgroundColor: COLORS.background,
              backgroundGradientFrom: COLORS.background,
              backgroundGradientTo: COLORS.background,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(77, 123, 243, ${opacity})`,
              labelColor: () => COLORS.text,
            }}
            style={styles.chart}
          />
          
          <View style={styles.insightContainer}>
            <Icon name="trending-up-outline" size={20} color={COLORS.good} style={styles.insightIcon} />
            <Text style={styles.insightText}>
              최근 집중도가 전반적으로 향상되는 추세입니다.
              생활 습관 개선이 효과를 보이고 있습니다.
            </Text>
          </View>
        </View>
        
        {/* 집중도 영향 요소 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>집중도 영향 요소</Text>
          
          {factorData.map((factor, index) => (
            <View key={index} style={styles.factorItem}>
              <View style={styles.factorHeader}>
                <Text style={styles.factorName}>{factor.name}</Text>
                <Text style={[
                  styles.factorImpact, 
                  factor.impact > 0 ? styles.positiveImpact : styles.negativeImpact
                ]}>
                  {factor.impact > 0 ? '+' : ''}{Math.round(factor.impact * 100)}%
                </Text>
              </View>
              
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { width: `${Math.round(factor.score * 100)}%` },
                    factor.impact > 0 ? styles.positiveBar : styles.negativeBar
                  ]} 
                />
              </View>
            </View>
          ))}
          
          <View style={styles.insightContainer}>
            <Icon name="flask-outline" size={20} color={COLORS.good} style={styles.insightIcon} />
            <Text style={styles.insightText}>
              수면과 운동이 집중도에 가장 긍정적인 영향을 주고 있습니다.
              스트레스 관리에 더 신경쓰면 집중력이 크게 향상될 수 있습니다.
            </Text>
          </View>
        </View>
        
        {/* 개선 영역 및 제안 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>집중도 개선 제안</Text>
          
          {focusData.improvement_areas?.map((area, index) => (
            <View key={index} style={styles.suggestionItem}>
              <Icon name="checkmark-circle-outline" size={24} color={COLORS.primary} style={styles.suggestionIcon} />
              <Text style={styles.suggestionText}>{area}</Text>
            </View>
          )) || (
            <>
              <View style={styles.suggestionItem}>
                <Icon name="checkmark-circle-outline" size={24} color={COLORS.primary} style={styles.suggestionIcon} />
                <Text style={styles.suggestionText}>규칙적인 수면 패턴 유지하기</Text>
              </View>
              <View style={styles.suggestionItem}>
                <Icon name="checkmark-circle-outline" size={24} color={COLORS.primary} style={styles.suggestionIcon} />
                <Text style={styles.suggestionText}>작업 사이에 적절한 휴식 시간 배분하기</Text>
              </View>
              <View style={styles.suggestionItem}>
                <Icon name="checkmark-circle-outline" size={24} color={COLORS.primary} style={styles.suggestionIcon} />
                <Text style={styles.suggestionText}>명상을 통한 스트레스 관리하기</Text>
              </View>
            </>
          )}
          
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>맞춤형 집중력 플랜 보기</Text>
            <Icon name="arrow-forward-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  backButton: {
    padding: 4,
  },
  headerRight: {
    width: 24,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 32,
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
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 8,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.subText,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  summaryTimeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  highFocus: {
    color: COLORS.good,
  },
  mediumFocus: {
    color: COLORS.warning,
  },
  lowFocus: {
    color: COLORS.bad,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  insightContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(77, 123, 243, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  insightIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  insightText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
    lineHeight: 20,
  },
  factorItem: {
    marginBottom: 16,
  },
  factorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  factorName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  factorImpact: {
    fontSize: 16,
    fontWeight: '600',
  },
  positiveImpact: {
    color: COLORS.good,
  },
  negativeImpact: {
    color: COLORS.bad,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  positiveBar: {
    backgroundColor: COLORS.good,
  },
  negativeBar: {
    backgroundColor: COLORS.bad,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
    lineHeight: 24,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default FocusDetailed;