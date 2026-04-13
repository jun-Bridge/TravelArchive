"""
FastAPI Dependency: JWT 검증 및 user_id 주입
"""
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

from backend.auth.jwt_utils import verify_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


async def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    """
    Authorization: Bearer {token} 헤더에서 user_id를 추출하여 반환.

    - Access Token을 ACCESS_TOKEN_SECRET_KEY로 검증
    - Refresh Token을 여기 끼워도 다른 키라 파싱 실패 → 401
    - 토큰이 없거나 만료된 경우 HTTPException(401)

    반환: user_id 문자열 ("MEM:abc123", "GST:uuid" 등)
    """
    if not token:
        raise HTTPException(status_code=401, detail="인증 토큰이 필요합니다")

    payload = verify_access_token(token)
    return payload["sub"]


async def get_current_member(user_id: str = Depends(get_current_user)) -> str:
    """
    게스트(GST)를 허용하지 않는 엔드포인트용.
    user_id가 GST로 시작하면 HTTPException(403).

    사용 예: 개인 설정 저장, 세션 이름 변경 등 회원 전용 기능
    """
    if user_id.startswith("GST"):
        raise HTTPException(status_code=403, detail="게스트는 이 기능을 사용할 수 없습니다")
    return user_id


async def get_optional_user(token: str = Depends(oauth2_scheme)) -> str | None:
    """
    인증 선택적 엔드포인트용. 토큰 없어도 None 반환 (에러 없음).
    사용 예: 공개 페이지, 공유 세션 보기 등
    """
    if not token:
        return None
    try:
        payload = verify_access_token(token)
        return payload["sub"]
    except HTTPException:
        return None
