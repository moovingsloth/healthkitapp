/**
 * FocusPredictionCard.tsx
 * 집중력 예측 결과를 표시하는 카드 컴포넌트
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { ConcentrationPrediction } from '../services/FocusAnalysisAPI';

interface FocusPredictionCardProps {
  prediction: ConcentrationPrediction | null;
  onRefresh: () => void;
  isLoading: boolean;
}

const FocusPredictionCard: React.FC<FocusPredictionCardProps> = ({
  prediction,
  onRefresh,
  isLoading,
}) => {
  const isDarkMode = useColorScheme() === 'dark';

  if (isLoading) {
    return (
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={[styles.loadingText, isDarkMode && styles.darkText]}>
          AI가 집중력을 분석하고 있습니다...
        </Text>
      </View>
    );
  }

  if (!prediction) {
    return (
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <Text style={[styles.emptyText, isDarkMode && styles.darkText]}>
          집중력 분석을 시작하려면 버튼을 눌러주세요
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      <View style={styles.scoreContainer}>
        <Text style={[styles.scoreLabel, isDarkMode && styles.darkText]}>
          집중력 점수
        </Text>
        <Text style={[styles.score, isDarkMode && styles.darkText]}>
          {Math.round(prediction.concentration_score)}점
        </Text>
        <View style={styles.confidenceContainer}>
          <Text style={[styles.confidenceText, isDarkMode && styles.darkText]}>
            신뢰도: {Math.round(prediction.confidence * 100)}%
          </Text>
        </View>
      </View>

      <View style={styles.recommendationsContainer}>
        <Text style={[styles.recommendationsTitle, isDarkMode && styles.darkText]}>
          개선 추천사항
        </Text>
        {prediction.recommendations.map((recommendation, index) => (
          <View key={index} style={styles.recommendationItem}>
            <Text style={[styles.recommendationText, isDarkMode && styles.darkText]}>
              • {recommendation}
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={onRefresh}
        disabled={isLoading}
      >
        <Text style={styles.refreshButtonText}>
          {isLoading ? '분석 중...' : '새로 분석하기'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkContainer: {
    backgroundColor: '#2c2c2e',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  darkText: {
    color: '#fff',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreLabel: {
    fontSize: 18,
    color: '#333',
    marginBottom: 8,
  },
  score: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  confidenceContainer: {
    marginTop: 8,
  },
  confidenceText: {
    fontSize: 14,
    color: '#666',
  },
  recommendationsContainer: {
    marginBottom: 24,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  recommendationItem: {
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FocusPredictionCard; 