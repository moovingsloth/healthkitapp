import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import { COLORS } from './colors';

interface GaugeChartProps {
  value: number;
  max?: number;
}

const GaugeChart: React.FC<GaugeChartProps> = ({ value, max = 100 }) => {
  // 색상 팔레트 수정: 높은 값(good)에 primary 색상 사용
  let color = COLORS.primary;  // 높은 값에 primary 색상 사용 (시간별 집중도 차트와 일치)
  if (value < 60) color = COLORS.point;  // 중간 값에 point(코랄) 색상 사용
  if (value < 40) color = COLORS.bad;    // 낮은 값에 bad(레드) 색상 사용
  
  return (
    <View style={styles.container}>
      <AnimatedCircularProgress
        size={140}
        width={16}
        fill={Math.min(100, (value / max) * 100)}
        tintColor={color}
        backgroundColor={COLORS.border}
        rotation={0}
        lineCap="round"
      >
        {() => (
          <Text style={[styles.value, { color }]}>{Math.round(value)}</Text>
        )}
      </AnimatedCircularProgress>
      <Text style={styles.label}>/ {max}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  value: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 14,
    color: COLORS.subText,  // 기존 #888을 subText 색상으로 변경
    marginTop: 4,
  },
});

export default GaugeChart;