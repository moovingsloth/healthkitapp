import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, StatusBar, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from './colors';
import { FocusAnalysisAPI } from '../services/FocusAnalysisAPI';
import GaugeChart from './GaugeChart';
import FocusHighlights from './FocusHighlights';

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

  return (
    <View style={[styles.root, {backgroundColor: '#fff'}]}>
      <StatusBar barStyle="dark-content" />
      {/* 1. Top Navigation Bar */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 2. Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.card, styles.focusCard]}>
            <View style={styles.focusCardHeader}>
              <Text style={styles.focusCardTitle}>현재 집중 상태</Text>
            </View>
            <View style={styles.focusCardContent}>
              <View style={styles.gaugeContainer}>
                <GaugeChart
                  value={typeof focusData.daily_average === 'number' ? Math.round(focusData.daily_average * 100) : 78}
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
              labels: ['오전 6시', '낮 12시', '오후 6시', '밤 12시'],
              datasets: [{
                data: Array.isArray(focus24h) && focus24h.length >= 5 ? focus24h.slice(0, 5) : [60, 70, 78, 75, 68],
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
        </View>
        {/* 집중도 하이라이트 섹션 */}
        <FocusHighlights 
          highestFocus={highestFocus}
          lowestFocus={lowestFocus}
          averageFocus={averageFocus}
        />
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
});

export default Dashboard;
