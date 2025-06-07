import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Text } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Card } from 'react-native-paper';
import { BiometricData } from '../services/FocusAnalysisAPI';
import GaugeChart from './GaugeChart'; // 게이지 차트 컴포넌트(아래에서 생성)

const screenWidth = Dimensions.get('window').width;

const Dashboard = () => {
  // 더미 데이터 (실제 API 연동 시 교체)
  const [focus24h, setFocus24h] = useState<number[]>([70, 72, 68, 75, 80, 78, 74, 76, 77, 73, 71, 69, 72, 74, 76, 78, 80, 82, 81, 79, 77, 75, 73, 72]);
  const [weeklyFocus, setWeeklyFocus] = useState<number[]>([70, 75, 80, 78, 76, 74, 77]);
  const [currentFocus, setCurrentFocus] = useState<number>(78);

  // 라벨 생성
  const hourLabels = useMemo(() => Array.from({length: 24}, (_, i) => `${i}시`), []);
  const weekLabels = ['월', '화', '수', '목', '금', '토', '일'];

  return (
    <ScrollView style={styles.container}>
      {/* 타이틀 */}
      <Text style={styles.title}>FocusTrack</Text>

      {/* 실시간 집중도 라인차트 */}
      <Card style={styles.card}>
        <Text style={styles.chartTitle}>실시간 집중도 (24시간)</Text>
        <LineChart
          data={{
            labels: hourLabels,
            datasets: [{ data: focus24h }],
          }}
          width={screenWidth - 32}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      </Card>

      {/* 주간 집중도 바차트 */}
      <Card style={styles.card}>
        <Text style={styles.chartTitle}>주간 집중도 트렌드</Text>
        <BarChart
          data={{
            labels: weekLabels,
            datasets: [{ data: weeklyFocus }],
          }}
          width={screenWidth - 32}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
          yAxisLabel=""
          yAxisSuffix="점"
        />
      </Card>

      {/* 현재 집중도 게이지 */}
      <Card style={styles.card}>
        <Text style={styles.chartTitle}>현재 집중도 수준</Text>
        <GaugeChart value={currentFocus} max={100} />
      </Card>
    </ScrollView>
  );
};

const chartConfig = {
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.7,
  useShadowColorFromDataset: false,
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#007AFF',
  },
  propsForBackgroundLines: {
    strokeDasharray: '',
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
    alignSelf: 'center',
    marginBottom: 16,
  },
  card: {
    margin: 8,
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 2,
    padding: 12,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
    alignSelf: 'center',
  },
  chart: {
    borderRadius: 16,
  },
});

export default Dashboard;
