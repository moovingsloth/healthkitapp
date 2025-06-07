import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Text, StatusBar } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import GaugeChart from './GaugeChart';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from './colors';
import FocusHighlights from './FocusHighlights'; // 새 컴포넌트 임포트

const screenWidth = Dimensions.get('window').width;

const Dashboard = () => {
  // 더미 데이터
  const [focus24h] = useState<number[]>([70, 72, 68, 75, 80, 78, 74, 76, 77, 73, 71, 69, 72, 74, 76, 78, 80, 82, 81, 79, 77, 75, 73, 72]);
  const [todayAvg] = useState<number[]>([65, 70, 75, 80, 78, 74, 77]);
  const [currentFocus] = useState<number>(78);
  const [weeklyHeatmap] = useState<number[][]>([
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

  // 현재 날짜/시간
  const now = new Date();
  const dateStr = `${now.getFullYear()}.${now.getMonth()+1}.${now.getDate()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

  // 집중도 하이라이트 데이터 계산
  const highestFocusIndex = focus24h.indexOf(Math.max(...focus24h));
  const lowestFocusIndex = focus24h.indexOf(Math.min(...focus24h));
  const averageFocus = Math.round(focus24h.reduce((a, b) => a + b, 0) / focus24h.length);
  
  const getTimeString = (hourIndex) => {
    // 24시간을 기준으로 시간 포맷팅 (예: '오전 9:00')
    const hour = hourIndex;
    if (hour < 12) {
      return `오전 ${hour}:00`;
    } else if (hour === 12) {
      return `오후 12:00`;
    } else {
      return `오후 ${hour - 12}:00`;
    }
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
    <ScrollView style={{ backgroundColor: COLORS.background }}>
      <View style={styles.grid}>
        {/* 1. 인트로 카드 */}
        {/* <View style={[styles.card, styles.introCard]}>
          <Text style={styles.title}>집중력 대시보드</Text>
          <Text style={styles.subText}>오늘의 집중 현황을 한눈에</Text>
        </View> */}
       {/* 게이지와 상태 카드를 포함하는 컨테이너 */}
      <View style={styles.rowContainer}>
        {/* 2. 통합된 집중도 카드 */}
        <View style={[styles.card, styles.focusCard]}>
          <View style={styles.focusCardHeader}>
            <Text style={styles.focusCardTitle}>현재 집중 상태</Text>
          </View>
          
          <View style={styles.focusCardContent}>
            <View style={styles.gaugeContainer}>
              <GaugeChart value={78} max={100} />
            </View>
            
            <View style={styles.statusContainer}>
              <Text style={styles.statusValue}>매우 좋음</Text>
              <Text style={styles.statusDescription}>
                현재 집중력이 높은 상태입니다. 중요한 작업을 진행하기에 적합한 시간입니다.
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
              labels: ['오전 6시', '낮 12시', '오후 6시', '밤 12시'],  // 가로축 라벨 수정
              datasets: [{ 
                data: [60, 70, 78, 75, 68], 
                color: () => COLORS.primary,  // 메인 컬러로 변경
                strokeWidth: 2  // 선 두께 지정
              }],
            }}
            width={screenWidth * 0.85}  // 차트 너비 증가
            height={160}                // 차트 높이 증가
            withHorizontalLines={true}  // 수평 그리드 라인 추가
            horizontalLabelRotation={-45}  // 라벨 회전
            chartConfig={{
              backgroundGradientFrom: COLORS.background,  // 배경색상 변경
              backgroundGradientTo: COLORS.background,
              decimalPlaces: 0,  // 소수점 제거
              color: () => COLORS.primary,  // 메인 컬러로 변경
              labelColor: () => COLORS.text,  // 라벨 색상 변경
              style: {
                borderRadius: 16
              },
              propsForDots: {
                r: '4',  // 점 크기 증가
                strokeWidth: '2',
                stroke: COLORS.primary,
                fill: COLORS.background  // 점 내부는 흰색
              },
              propsForBackgroundLines: {
                strokeDasharray: '', // 실선으로 변경
                stroke: COLORS.border,
                strokeWidth: 0.5
              }
            }}
            bezier  // 부드러운 곡선으로 변경
            style={{
              borderRadius: 16,
              paddingRight: 12,
              marginVertical: 8
            }}
          />
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, {backgroundColor: COLORS.primary}]} />
              <Text style={styles.legendText}>집중도 (%)</Text>
            </View>
          </View>
        </View>
        {/* 집중도 하이라이트 섹션 */}
        <FocusHighlights 
          highestFocus={highestFocus}
          lowestFocus={lowestFocus}
          averageFocus={averageFocus}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 12,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    margin: 6,
    padding: 18,
    minWidth: '46%',
    minHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  introCard: { width: '100%', minHeight: 80 },
  gaugeCard: { width: '46%' },
  chartCard: { width: '52%' },
  heatmapCard: { width: '100%', minHeight: 80 },
  infoCard: { width: '46%', alignItems: 'center' },
  title: { fontSize: 22, color: COLORS.text, fontWeight: 'bold' },
  subText: { color: COLORS.subText, fontSize: 14 },
  infoTitle: { color: COLORS.subText, fontSize: 13 },
  infoValue: { color: COLORS.text, fontSize: 32, fontWeight: 'bold' },
  heatmapRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  heatmapBlock: {
    width: 32, height: 24, marginHorizontal: 2, borderRadius: 6,
    backgroundColor: COLORS.good,
    shadowOpacity: 0.5, elevation: 2,
  },
    chartCard: { 
    width: '100%',   // 전체 너비 사용
    paddingVertical: 16,
    alignItems: 'center'
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    alignSelf: 'flex-start',
    marginBottom: 12
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4
  },
  legendText: {
    fontSize: 12,
    color: COLORS.subText
  },
    statusCard: { 
    width: '46%', 
    minHeight: 140, 
    position: 'relative', 
    justifyContent: 'space-between' 
  },
  statusTitle: { 
    fontSize: 14, 
    color: COLORS.subText, 
    marginBottom: 4 
  },
  statusValue: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: COLORS.text, 
    marginBottom: 4 
  },
  statusDescription: { 
    fontSize: 12, 
    color: COLORS.subText, 
    lineHeight: 16 
  },
  statusIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.background,
    padding: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
    rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  
  // 가로 배치를 위해 카드 스타일 수정
  gaugeCard: { 
    width: '48%',  // 약간 증가시켜 공간 확보
    marginRight: 0,  // 오른쪽 마진 제거
  },
  
  statusCard: { 
    width: '48%',  // 약간 증가시켜 공간 확보
    minHeight: 140, 
    position: 'relative', 
    justifyContent: 'space-between',
    marginLeft: 0,  // 왼쪽 마진 제거
  },
  focusCard: {
    width: '100%',
    minHeight: 180,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    padding: 20,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  focusCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  focusCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  focusCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gaugeContainer: {
    width: '45%',
    alignItems: 'center',
  },
  statusContainer: {
    width: '50%',
    paddingLeft: 10,
  },
  statusValue: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: COLORS.text, 
    marginBottom: 6 
  },
  statusDescription: { 
    fontSize: 14, 
    color: COLORS.subText, 
    lineHeight: 18 
  },
  statusIndicator: {
    backgroundColor: COLORS.background,
    padding: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
});

export default Dashboard;
