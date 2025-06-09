import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { COLORS } from './colors';

interface FocusRecommendationsProps {
  recommendations: string[];
}

const FocusRecommendations = ({ recommendations }: FocusRecommendationsProps) => {
  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>집중도 향상 추천</Text>
      <FlatList
        data={recommendations}
        keyExtractor={(item, index) => `recommendation-${index}`}
        renderItem={({ item }) => (
          <View style={styles.recommendationItem}>
            <View style={styles.bullet} />
            <Text style={styles.recommendationText}>{item}</Text>
          </View>
        )}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 6,
    marginRight: 8,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
});

export default FocusRecommendations;