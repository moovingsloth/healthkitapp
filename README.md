# HealthKit React Native App 🍎⌚

Apple HealthKit과 Apple Watch 연동을 통한 종합적인 건강 데이터 모니터링 앱입니다.

## 📱 주요 기능

### HealthKit 데이터 수집
- **심박수**: 실시간 및 과거 심박수 데이터
- **안정시 심박수**: 일별 안정시 심박수 추이
- **걸음 수**: 일일 걸음 수 추적
- **활동 에너지**: 소모된 칼로리 정보
- **걷기/달리기 거리**: 일일 이동 거리
- **혈압**: 수축기/이완기 혈압 기록
- **체온**: 체온 측정 데이터
- **산소포화도**: 혈중 산소포화도
- **수면 분석**: 수면 시간 및 패턴

### Apple Watch 연동 (데모)
- Watch 연결 상태 모니터링
- 실시간 데이터 동기화
- Watch 앱 설치 상태 확인

### 사용자 인터페이스
- **다크 모드 지원**: 시스템 설정에 따른 자동 테마 변경
- **카드 기반 UI**: 데이터별로 구분된 직관적인 카드 레이아웃
- **새로고침 기능**: Pull-to-refresh 및 수동 새로고침
- **실시간 업데이트**: 마지막 업데이트 시간 표시

## 🚀 설치 및 실행

### 사전 요구사항
- Node.js 18+
- React Native CLI
- Xcode (iOS 개발용)
- iOS 시뮬레이터 또는 실제 iOS 기기

### 설치
```bash
# 의존성 설치
npm install

# iOS Pod 설치
cd ios && pod install && cd ..
```

### 실행
```bash
# iOS 시뮬레이터에서 실행
npm run ios

# 실제 기기에서 실행 (기기 연결 후)
npm run ios -- --device
```

## ⚙️ 설정

### HealthKit 권한
앱이 HealthKit 데이터에 접근하려면 다음 권한이 필요합니다:

1. **iOS 설정 > 개인정보 보호 및 보안 > 건강**에서 앱 권한 설정
2. 첫 실행 시 권한 요청 팝업에서 허용

### Apple Watch 연동
현재 버전은 데모 구현을 제공합니다. 실제 Apple Watch 연동을 위해서는:

1. **WatchOS 앱 개발**: Apple Watch용 앱 개발
2. **WatchConnectivity 프레임워크**: iOS와 WatchOS 간 통신 설정
3. **Watch 앱 설치**: 개발된 앱을 Apple Watch에 설치

## 📊 데이터 구조

### HealthData Interface
```typescript
interface HealthData {
  heartRate: Array<{value: number, startDate: string}>;
  steps: number | null;
  bloodPressure: Array<{systolic: number, diastolic: number, startDate: string}>;
  bodyTemperature: Array<{value: number, startDate: string}>;
  oxygenSaturation: Array<{value: number, startDate: string}>;
  sleepAnalysis: Array<{value: string, startDate: string, endDate: string}>;
  activeEnergy: number | null;
  restingHeartRate: Array<{value: number, startDate: string}>;
  walkingDistance: number | null;
}
```

## 🔧 기술 스택

- **React Native 0.79.2**: 크로스 플랫폼 모바일 앱 프레임워크
- **TypeScript**: 타입 안전성을 위한 정적 타입 언어
- **react-native-health 1.19.0**: HealthKit 연동 라이브러리
- **react-native-watch-connectivity**: Apple Watch 연동 라이브러리

## 📱 화면 구성

### 메인 대시보드
1. **헤더**: 앱 제목, 마지막 업데이트 시간, 새로고침 버튼
2. **Apple Watch 연결 상태**: 연결 상태 및 데이터 요청 기능
3. **오늘의 활동 요약**: 걸음 수, 칼로리, 이동 거리
4. **생체 데이터 카드들**: 각종 건강 데이터 표시
5. **푸터**: 사용법 안내

### 데이터 카드별 정보
- **심박수**: 최근 3개 측정값과 시간
- **안정시 심박수**: 최근 2일간의 데이터
- **혈압**: 최근 2개 측정값 (수축기/이완기)
- **산소포화도**: 백분율로 표시
- **체온**: 섭씨 온도로 표시
- **수면 분석**: 수면 시간과 패턴

## 🎨 UI/UX 특징

### 반응형 디자인
- 다크 모드 자동 적용
- 시각적 구분을 위한 이모지 아이콘 사용
- 카드 기반 레이아웃으로 정보 구조화

### 사용자 경험
- Pull-to-refresh로 쉬운 데이터 업데이트
- 로딩 상태 표시
- 에러 처리 및 사용자 알림
- 데이터 없음 상태 처리
