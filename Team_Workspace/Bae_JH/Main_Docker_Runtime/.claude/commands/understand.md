# /understand — TravelArchive 코드베이스 이해 스킬

주어진 모듈 또는 전체 프로젝트를 스캔하여 구조 분석 보고서와 의존성 맵을 생성한다.

## 사용법

```
/understand [대상 디렉토리 또는 모듈명]
```

예시:
- `/understand` — 전체 프로젝트 분석
- `/understand backend` — 백엔드만 분석
- `/understand module/node` — LLM 노드 시스템만 분석
- `/understand frontend/src/js` — 프론트엔드 JS 레이어 분석

## 실행 절차

**$ARGUMENTS** 가 비어있으면 전체 프로젝트를 대상으로 한다. 특정 경로가 주어지면 그 경로만 분석한다.

### 1단계: 프로젝트 스캔

다음 정보를 수집한다:

```bash
# 디렉토리 구조 (depth 3)
find $ARGUMENTS -type f -name "*.py" -o -name "*.js" -o -name "*.ts" -o -name "*.html" | head -100

# 주요 파일 목록
find $ARGUMENTS -maxdepth 3 -name "*.py" | grep -v __pycache__ | sort
```

### 2단계: 핵심 파일 분석

각 레이어별 대표 파일을 읽어 다음을 파악한다:
- 주요 클래스·함수 목록
- 외부 의존성 (import 문)
- 내부 모듈 간 호출 관계

### 3단계: 7-레이어 아키텍처 보고서 생성

다음 형식으로 보고서를 출력한다:

```markdown
# [대상] 아키텍처 분석

## 레이어 구조
1. **진입점 (Entry Points)** — 라우터, 엔드포인트, 이벤트 핸들러
2. **비즈니스 로직 (Business Logic)** — 서비스, 유즈케이스
3. **도메인 모델 (Domain Models)** — 엔티티, 스키마, Pydantic 모델
4. **인프라 (Infrastructure)** — DB, 캐시, 외부 API 클라이언트
5. **공통 유틸 (Utilities)** — 헬퍼, 데코레이터, 설정
6. **에이전트/LLM (Agent Layer)** — 노드 시스템, 프롬프트
7. **인터페이스 (Interface)** — 프론트엔드 연동, WebSocket

## 의존 관계 맵
(모듈 간 import 방향을 텍스트 그래프로 표현)

## 주요 데이터 흐름
(핵심 API 요청이 어떤 레이어를 거쳐 응답되는지)

## 핫스팟 (변경 영향이 큰 파일)
(의존하는 곳이 많은 상위 5개 파일)

## 온보딩 추천 순서
(새 개발자가 어떤 순서로 파일을 읽으면 좋은지)
```

### 4단계: 인터랙티브 탐색 제안

보고서 출력 후 다음을 묻는다:
- "특정 레이어를 더 자세히 볼까요?"
- "데이터 흐름을 한 가지 골라 추적할까요?"
- "온보딩 가이드 MD 파일로 저장할까요? (`/understand-onboard`)"
