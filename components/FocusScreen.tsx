import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import ConcentrationPredictor from './ConcentrationPredictor';
import { BiometricData } from '../services/FocusAnalysisAPI';

const FocusScreen: React.FC = () => {
  const [userId, setUserId] = useState<string>('user123');
  const [biometricData, setBiometricData] = useState<BiometricData>({
    heart_rate: 75,
    sleep_hours: 7.5,
    steps: 8000,
    stress_level: 4,
    activity_level: 6,
    caffeine_intake: 2,
    water_intake: 2.5
  });
  
  // 생체 데이터 입력 필드
  const [inputData, setInputData] = useState<BiometricData>({...biometricData});
  
  // 생체 데이터 업데이트
  const updateBiometricData = () => {
    setBiometricData({...inputData});
  };
  
  // 입력값 변경 핸들러
  const handleInputChange = (field: keyof BiometricData, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setInputData(prev => ({
        ...prev,
        [field]: numValue
      }));
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>집중도 예측</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.sectionTitle}>생체 데이터 입력</Text>
        
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>심박수 (BPM)</Text>
          <TextInput
            style={styles.input}
            value={inputData.heart_rate.toString()}
            onChangeText={(value) => handleInputChange('heart_rate', value)}
            keyboardType="numeric"
            placeholder="60-100"
          />
        </View>
        
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>수면 시간 (시간)</Text>
          <TextInput
            style={styles.input}
            value={inputData.sleep_hours.toString()}
            onChangeText={(value) => handleInputChange('sleep_hours', value)}
            keyboardType="numeric"
            placeholder="6-9"
          />
        </View>
        
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>걸음 수</Text>
          <TextInput
            style={styles.input}
            value={inputData.steps.toString()}
            onChangeText={(value) => handleInputChange('steps', value)}
            keyboardType="numeric"
            placeholder="5000-10000"
          />
        </View>
        
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>스트레스 지수 (1-10)</Text>
          <TextInput
            style={styles.input}
            value={inputData.stress_level.toString()}
            onChangeText={(value) => handleInputChange('stress_level', value)}
            keyboardType="numeric"
            placeholder="1-10"
          />
        </View>
        
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>활동 강도 (1-10)</Text>
          <TextInput
            style={styles.input}
            value={inputData.activity_level.toString()}
            onChangeText={(value) => handleInputChange('activity_level', value)}
            keyboardType="numeric"
            placeholder="1-10"
          />
        </View>
        
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>카페인 섭취량 (잔)</Text>
          <TextInput
            style={styles.input}
            value={inputData.caffeine_intake.toString()}
            onChangeText={(value) => handleInputChange('caffeine_intake', value)}
            keyboardType="numeric"
            placeholder="0-5"
          />
        </View>
        
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>수분 섭취량 (리터)</Text>
          <TextInput
            style={styles.input}
            value={inputData.water_intake.toString()}
            onChangeText={(value) => handleInputChange('water_intake', value)}
            keyboardType="numeric"
            placeholder="1-3"
          />
        </View>
        
        <TouchableOpacity 
          style={styles.updateButton}
          onPress={updateBiometricData}
        >
          <Text style={styles.updateButtonText}>집중도 예측하기</Text>
        </TouchableOpacity>
      </View>
      
      <ConcentrationPredictor 
        biometricData={biometricData}
        userId={userId}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
    textAlign: 'center',
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    flex: 1,
    fontSize: 16,
    color: '#444',
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#333',
  },
  updateButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FocusScreen; 