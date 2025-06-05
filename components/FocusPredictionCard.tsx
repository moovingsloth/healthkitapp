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
  useColorScheme,
  ScrollView,
  Alert,
} from 'react-native';
import { FocusPrediction } from '../services/FocusAnalysisAPI';

interface FocusPredictionCardProps {
  prediction: FocusPrediction | null;
  onRefresh: () => void;
  isLoading: boolean;
}

const FocusPredictionCard: React.FC<FocusPredictionCardProps> = ({
  prediction,
  onRefresh,
  isLoading,
}) => {
  const isDarkMode = useColorScheme() === 'dark';

  const textColor = {
    color: isDarkMode ? '#FFFFFF' : '#000000',
  };

  const cardStyle = {
    backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF',
    ...styles.card,
  };

  const getFocusLevelColor = (level: string) => {
    switch (level) {
      case 'peak': return '#00C851'; // 초록
      case 'high': return '#39C0ED'; // 파랑
      case 'medium': return '#FF8A00'; // 주황
      case 'low': return '#FF3547'; // 빨강
      default: return '#666666'; // 회색
    }
  };

  const getFocusLevelEmoji = (level: string) => {
    switch (level) {
      case 'peak': return '🎯';
      case 'high': return '🧠';
      case 'medium': return '⚡';
      case 'low': return '😴';
      default: return '🤔';
    }
  };

  const getFocusLevelText = (level: string) => {
    switch (level) {
      case 'peak': return '최고 집중';
      case 'high': return '높은 집중';
      case 'medium': return '보통 집중';
      case 'low': return '낮은 집중';
      default: return '측정 중';
    }
  };

  const showTrends = () => {
    if (!prediction) return;
    
    const trendsText = `📊 24시간 집중력 추이:\n${prediction.trends.hourly.map((score, index) => 
      `${index}시: ${score.toFixed(0)}점`
    ).join(', ')}\n\n📅 주간 평균:\n${prediction.trends.weekly.map((score, index) => 
      `${['월', '화', '수', '목', '금', '토', '일'][index]}: ${score.toFixed(0)}점`
    ).join(', ')}`;
    
    Alert.alert('집중력 트렌드 분석', trendsText);
  };

  if (!prediction) {
    return (
      <View style={cardStyle}>
        <Text style={[styles.cardTitle, textColor]}>
          🧠 AI 집중력 예측
        </Text>
        
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, textColor]}>
            {isLoading ? '분석 중...' : '생체 데이터를 수집하여 집중력을 예측합니다'}
          </Text>
          
          <TouchableOpacity
            style={styles.analyzeButton}
            onPress={onRefresh}
            disabled={isLoading}
          >
            <Text style={styles.analyzeButtonText}>
              {isLoading ? '🧠 분석 중...' : '🔍 집중력 분석 시작'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={cardStyle}>
      <View style={styles.header}>
        <Text style={[styles.cardTitle, textColor]}>
          🧠 AI 집중력 예측
        </Text>
        
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={isLoading}
        >
          <Text style={styles.refreshButtonText}>
            {isLoading ? '⏳' : '🔄'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* 메인 점수 */}
      <View style={styles.scoreContainer}>
        <View style={styles.scoreCircle}>
          <Text style={[styles.scoreNumber, { color: getFocusLevelColor(prediction.focusLevel) }]}>
            {prediction.focusScore}
          </Text>
          <Text style={[styles.scoreLabel, textColor]}>집중력 점수</Text>
        </View>
        
        <View style={styles.levelContainer}>
          <Text style={[styles.levelEmoji]}>
            {getFocusLevelEmoji(prediction.focusLevel)}
          </Text>
          <Text style={[styles.levelText, { color: getFocusLevelColor(prediction.focusLevel) }]}>
            {getFocusLevelText(prediction.focusLevel)}
          </Text>
          <Text style={[styles.confidenceText, textColor]}>
            신뢰도: {(prediction.confidence * 100).toFixed(0)}%
          </Text>
        </View>
      </View>
      
      {/* 요인 분석 */}
      <View style={styles.factorsContainer}>
        {prediction.factors.positive.length > 0 && (
          <View style={styles.factorSection}>
            <Text style={[styles.factorTitle, { color: '#00C851' }]}>
              ✅ 긍정적 요인
            </Text>
            {prediction.factors.positive.map((factor, index) => (
              <Text key={index} style={[styles.factorText, textColor]}>
                • {factor}
              </Text>
            ))}
          </View>
        )}
        
        {prediction.factors.negative.length > 0 && (
          <View style={styles.factorSection}>
            <Text style={[styles.factorTitle, { color: '#FF3547' }]}>
              ⚠️ 개선 필요
            </Text>
            {prediction.factors.negative.map((factor, index) => (
              <Text key={index} style={[styles.factorText, textColor]}>
                • {factor}
              </Text>
            ))}
          </View>
        )}
      </View>
      
      {/* 추천사항 */}
      <View style={styles.recommendationsContainer}>
        <Text style={[styles.recommendationsTitle, textColor]}>
          💡 개선 추천사항
        </Text>
        <ScrollView style={styles.recommendationsScroll} showsVerticalScrollIndicator={false}>
          {prediction.recommendations.slice(0, 3).map((recommendation, index) => (
            <Text key={index} style={[styles.recommendationText, textColor]}>
              {recommendation}
            </Text>
          ))}
        </ScrollView>
      </View>
      
      {/* 다음 최적 시간 */}
      {prediction.nextOptimalTime && (
        <View style={styles.nextTimeContainer}>
          <Text style={[styles.nextTimeLabel, textColor]}>
            🎯 다음 최적 집중 시간
          </Text>
          <Text style={[styles.nextTimeText, textColor]}>
            {new Date(prediction.nextOptimalTime).toLocaleString('ko-KR', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      )}
      
      {/* 트렌드 버튼 */}
      <TouchableOpacity
        style={styles.trendsButton}
        onPress={showTrends}
      >
        <Text style={styles.trendsButtonText}>
          📊 트렌드 분석 보기
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 15,
    padding: 20,
    borderRadius: 15,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.7,
  },
  analyzeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  analyzeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  scoreCircle: {
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 5,
  },
  levelContainer: {
    alignItems: 'center',
  },
  levelEmoji: {
    fontSize: 32,
    marginBottom: 5,
  },
  levelText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  confidenceText: {
    fontSize: 12,
    opacity: 0.7,
  },
  factorsContainer: {
    marginBottom: 20,
  },
  factorSection: {
    marginBottom: 10,
  },
  factorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  factorText: {
    fontSize: 13,
    marginLeft: 10,
    marginBottom: 2,
  },
  recommendationsContainer: {
    marginBottom: 20,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  recommendationsScroll: {
    maxHeight: 80,
  },
  recommendationText: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  nextTimeContainer: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  nextTimeLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 5,
  },
  nextTimeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  trendsButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  trendsButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default FocusPredictionCard; 