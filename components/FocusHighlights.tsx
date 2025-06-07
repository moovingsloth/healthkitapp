import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from './colors';

interface FocusHighlightsProps {
  highestFocus: {
    value: number;
    time: string;
  };
  lowestFocus: {
    value: number;
    time: string;
  };
  averageFocus: number;
}

const FocusHighlights: React.FC<FocusHighlightsProps> = ({ 
  highestFocus, 
  lowestFocus, 
  averageFocus 
}) => {
  return (
    <View style={styles.container}>
      {/* 오늘 집중도가 가장 높았던 시간 */}
      <View style={[styles.card, styles.highlightCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>가장 높은 집중도</Text>
          <View style={[styles.indicatorDot, { backgroundColor: COLORS.primaryPastel }]} />
        </View>
        <Text style={styles.focusValue}>{highestFocus.value}</Text>
        <Text style={styles.focusTime}>{highestFocus.time}</Text>
      </View>
      
      {/* 오늘 집중도가 가장 낮았던 시간 */}
      <View style={[styles.card, styles.highlightCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>가장 낮은 집중도</Text>
          <View style={[styles.indicatorDot, { backgroundColor: COLORS.badPastel }]} />
        </View>
        <Text style={styles.focusValue}>{lowestFocus.value}</Text>
        <Text style={styles.focusTime}>{lowestFocus.time}</Text>
      </View>
      
      {/* 오늘 평균 집중도 */}
      <View style={[styles.card, styles.highlightCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>오늘 평균</Text>
          <View style={[styles.indicatorDot, { backgroundColor: COLORS.primary }]} />
        </View>
        <Text style={styles.focusValue}>{averageFocus}</Text>
        <Text style={styles.focusLabel}>집중도</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
  },
  highlightCard: {
    width: '31%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 12,
    color: COLORS.subText,
    fontWeight: '500',
  },
  focusValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  focusTime: {
    fontSize: 10,
    color: COLORS.subText,
    marginTop: 4,
    textAlign: 'center',
  },
  focusLabel: {
    fontSize: 10,
    color: COLORS.subText,
    marginTop: 4,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default FocusHighlights;