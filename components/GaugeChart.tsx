import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AnimatedCircularProgress } from 'react-native-circular-progress';

interface GaugeChartProps {
  value: number;
  max?: number;
}

const GaugeChart: React.FC<GaugeChartProps> = ({ value, max = 100 }) => {
  let color = '#27ae60';
  if (value < 60) color = '#e67e22';
  if (value < 40) color = '#e74c3c';
  return (
    <View style={styles.container}>
      <AnimatedCircularProgress
        size={140}
        width={16}
        fill={Math.min(100, (value / max) * 100)}
        tintColor={color}
        backgroundColor="#eee"
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
    color: '#888',
    marginTop: 4,
  },
});

export default GaugeChart; 