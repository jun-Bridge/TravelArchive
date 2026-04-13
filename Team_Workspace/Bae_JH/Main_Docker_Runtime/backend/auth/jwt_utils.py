import uuid
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException

# 환경 변수에서 직접 로드
ACCESS_TOKEN_SECRET_KEY = os.getenv("ACCESS_TOKEN_SECRET_KEY", "")
REFRESH_TOKEN_SECRET_KEY = os.getenv("REFRESH_TOKEN_SECRET_KEY", "")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

ALGORITHM = "HS256"


def create_access_token(user_id: str) -> str:
    """
    Access Token 생성.
    서명 키: ACCESS_TOKEN_SECRET_KEY (REFRESH와 다른 값)
    payload: {
        sub:  user_id ("MEM:abc", "GST:uuid"),
        type: user_id.split(":")[0] ("MEM", "GST", ...),
        jti:  str(uuid4()) — 이 토큰 고유 ID (Redis에는 저장 안 함),
        exp:  now + ACCESS_TOKEN_EXPIRE_MINUTES
    }
    """
    now = datetime.now(tz=timezone.utc)
    expire = now + timedelta(minutes=int(ACCESS_TOKEN_EXPIRE_MINUTES))
    payload = {
        "sub": user_id,
        "type": user_id.split(":")[0],
        "jti": str(uuid.uuid4()),
        "exp": expire,
    }
    return jwt.encode(payload, ACCESS_TOKEN_SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id: str, ttl_seconds: int = None) -> tuple[str, str]:
    """
    Refresh Token 생성.
    서명 키: REFRESH_TOKEN_SECRET_KEY (ACCESS와 다른 값)
    ttl_seconds: None이면 REFRESH_TOKEN_EXPIRE_DAYS 사용, 게스트는 86400 전달

    반환: (refresh_token_str, jti)
    jti를 함께 반환하는 이유: 호출자가 Redis에 저장할 때 jti가 필요하므로
    payload는 Access Token과 동일 구조 (sub, type, jti, exp)
    """
    now = datetime.now(tz=timezone.utc)
    if ttl_seconds is None:
        ttl_seconds = int(REFRESH_TOKEN_EXPIRE_DAYS) * 24 * 3600
    expire = now + timedelta(seconds=ttl_seconds)
    jti = str(uuid.uuid4())
    payload = {
        "sub": user_id,
        "type": user_id.split(":")[0],
        "jti": jti,
        "exp": expire,
    }
    token = jwt.encode(payload, REFRESH_TOKEN_SECRET_KEY, algorithm=ALGORITHM)
    return token, jti


def verify_access_token(token: str) -> dict:
    """
    Access Token 검증 및 payload 반환.
    ACCESS_TOKEN_SECRET_KEY로만 검증 → Refresh Token은 여기서 파싱 실패
    만료 또는 서명 오류 시 HTTPException(401).
    """
    try:
        payload = jwt.decode(token, ACCESS_TOKEN_SECRET_KEY, algorithms=[ALGORITHM])
        if "sub" not in payload:
            raise HTTPException(status_code=401, detail="유효하지 않은 토큰")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="토큰이 만료되었습니다")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰")


def verify_refresh_token(token: str) -> dict:
    """
    Refresh Token 검증 및 payload 반환.
    REFRESH_TOKEN_SECRET_KEY로만 검증 → Access Token은 여기서 파싱 실패
    만료 또는 서명 오류 시 HTTPException(401).
    """
    try:
        payload = jwt.decode(token, REFRESH_TOKEN_SECRET_KEY, algorithms=[ALGORITHM])
        if "sub" not in payload or "jti" not in payload:
            raise HTTPException(status_code=401, detail="유효하지 않은 갱신 토큰")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="갱신 토큰이 만료되었습니다")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="유효하지 않은 갱신 토큰")
