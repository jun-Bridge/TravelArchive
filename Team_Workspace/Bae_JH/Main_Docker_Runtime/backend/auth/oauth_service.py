"""
OAuth SNS 로그인 목업 (Phase 7 이후 구현)
각 제공자별로 실제 API 연동, 토큰 교환 등을 구현할 예정.
"""

async def kakao_login(code: str) -> dict:
    """
    카카오 OAuth 콜백 처리 (구현 예정)

    흐름:
    1. authorization code → access_token 교환
    2. access_token으로 사용자 정보 조회 (provider_sub)
    3. user_oauth 테이블에서 (KKO, provider_sub) 검색
    4. 기존: 로그인, 신규: 회원가입 후 로그인
    """
    pass


async def naver_login(code: str) -> dict:
    """
    네이버 OAuth 콜백 처리 (구현 예정)

    흐름: kakao_login과 동일 (provider만 NVR로 다름)
    """
    pass


async def google_login(id_token: str) -> dict:
    """
    구글 OAuth 콜백 처리 (구현 예정)

    Google은 id_token을 직접 검증하는 방식 사용.

    흐름:
    1. id_token → JWT 검증 (Google 공개키로)
    2. id_token payload에서 sub (provider_sub) 추출
    3. user_oauth 테이블에서 (GGL, provider_sub) 검색
    4. 기존: 로그인, 신규: 회원가입 후 로그인
    """
    pass
