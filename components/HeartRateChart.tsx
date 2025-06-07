import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { COLORS } from './colors';
import { fetchHeartRateByPeriod } from '../services/HealthKitService';

const { width: screenWidth } = Dimensions.get('window');

interface HeartRateChartProps {
  initialPeriod?: 'day' | 'week' | 'month';
}

const HeartRateChart: React.FC<HeartRateChartProps> = ({ initialPeriod = 'day' }) => {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>(initialPeriod);
  const [heartRateData, setHeartRateData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadHeartRateData = async () => {
      setLoading(true);
      const data = await fetchHeartRateByPeriod(period);
      setHeartRateData(data);
      setLoading(false);
    };
    
    loadHeartRateData();
  }, [period]);

  const renderPeriodButton = (buttonPeriod: 'day' | 'week' | 'month', label: string) => (
    <TouchableOpacity 
      style={[styles.periodButton, period === buttonPeriod && styles.activePeriod]}
      onPress={() => setPeriod(buttonPeriod)}
    >
      <Text style={[styles.periodText, period === buttonPeriod && styles.activePeriodText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  // 차트에 표시할 레이블 수 최적화
  const getOptimizedLabels = () => {
    if (!heartRateData) return [];
    
    const { labels, period } = heartRateData;
    
    // 일 데이터는 3시간 간격으로 표시 (8개)
    if (period === 'day') {
      return labels.filter((_, i) => i % 3 === 0 || i === labels.length - 1);
    } 
    // 주 데이터는 그대로 표시 (7개)
    else if (period === 'week') {
      return labels;
    } 
    // 월 데이터는 5일 간격으로 표시 (약 6개)
    else {
      return labels.filter((_, i) => i % 5 === 0 || i === labels.length - 1);
    }
  };

  // 최적화된 데이터 포인트
  const getOptimizedDataset = () => {
    if (!heartRateData) return [];
    
    const { values, period } = heartRateData;
    
    if (period === 'day') {
      return { 
        data: values,
        withDots: false // 시간별 데이터는 점이 너무 많아서 제거
      };
    } else {
      return { 
        data: values,
        withDots: true
      };
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>심박수 데이터 로딩 중...</Text>
      </View>
    );
  }

  if (!heartRateData) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.errorText}>데이터를 불러올 수 없습니다.</Text>
      </View>
    );
  }

  const optimizedLabels = getOptimizedLabels();
  const optimizedDataset = getOptimizedDataset();

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.chartTitle}>심박수</Text>
        <View style={styles.periodSelector}>
          {renderPeriodButton('day', '오늘')}
          {renderPeriodButton('week', '주간')}
          {renderPeriodButton('month', '월간')}
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>평균</Text>
          <Text style={styles.statValue}>{heartRateData.average}<Text style={styles.statUnit}>bpm</Text></Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>최고</Text>
          <Text style={styles.statValue}>{heartRateData.max}<Text style={styles.statUnit}>bpm</Text></Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>최저</Text>
          <Text style={styles.statValue}>{heartRateData.min}<Text style={styles.statUnit}>bpm</Text></Text>
        </View>
      </View>

      <LineChart
        data={{
          labels: optimizedLabels,
          datasets: [
            {
              data: optimizedDataset.data,
              color: () => COLORS.primary,
              strokeWidth: 2
            }
          ]
        }}
        width={screenWidth * 0.85}
        height={180}
        chartConfig={{
          backgroundColor: COLORS.background,
          backgroundGradientFrom: COLORS.background,
          backgroundGradientTo: COLORS.background,
          decimalPlaces: 0,
          color: () => COLORS.primary,
          labelColor: () => COLORS.subText,
          propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: COLORS.primary
          },
          propsForBackgroundLines: {
            strokeDasharray: '',
            stroke: COLORS.border,
            strokeWidth: 0.5
          }
        }}
        bezier
        style={styles.chart}
        withDots={optimizedDataset.withDots}
        withInnerLines={true}
        withOuterLines={false}
        withHorizontalLabels={true}
        withVerticalLabels={true}
        withShadow={false}
        yAxisInterval={40}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.subText,
    fontSize: 14
  },
  errorText: {
    color: COLORS.bad,
    fontSize: 14
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text
  },
  periodSelector: {
    flexDirection: 'row',
  },
  periodButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginLeft: 6
  },
  activePeriod: {
    backgroundColor: COLORS.primaryPastel
  },
  periodText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500'
  },
  activePeriodText: {
    color: COLORS.background
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 10
  },
  statItem: {
    alignItems: 'center',
    paddingVertical: 8
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.subText,
    marginBottom: 4
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text
  },
  statUnit: {
    fontSize: 12,
    color: COLORS.subText,
    fontWeight: 'normal'
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  }
});

export default HeartRateChart;