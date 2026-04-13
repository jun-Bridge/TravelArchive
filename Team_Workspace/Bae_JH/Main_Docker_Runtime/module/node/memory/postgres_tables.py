from sqlalchemy import (
    Boolean, Column, Date, ForeignKey, Integer,
    String, Text, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class User(Base):
    """루트 식별자. 모든 사용자 테이블의 기준점."""
    __tablename__ = "users"

    user_id    = Column(String(40), primary_key=True)
    user_type  = Column(String(3),  nullable=False)             # MEM / KKO / NVR / GGL / GST
    status     = Column(String(10), nullable=False, default="active")  # active / inactive / banned
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())


class UserProfile(Base):
    """개인정보. email이 로그인 ID로 사용됨 (UNIQUE)."""
    __tablename__ = "user_profile"

    user_id         = Column(String(40), ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    email           = Column(String(255), unique=True, nullable=True)  # MEM 필수, OAuth는 nullable
    nickname        = Column(String(50),  nullable=True)
    birthday        = Column(Date,        nullable=True)
    profile_img_url = Column(Text,        nullable=True)
    updated_at      = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class UserSecurity(Base):
    """보안정보. password_hash는 자체 가입(MEM)만 필수, OAuth 전용 계정은 NULL."""
    __tablename__ = "user_security"

    user_id           = Column(String(40), ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    password_hash     = Column(Text,    nullable=False)  # MEM 필수
    last_login_at     = Column(TIMESTAMP(timezone=True), nullable=True)
    login_fail_count  = Column(Integer, nullable=False, default=0)
    locked_until      = Column(TIMESTAMP(timezone=True), nullable=True)


class UserOAuth(Base):
    """SNS 연동. 1:N — 한 계정에 복수 SNS 연동 가능."""
    __tablename__ = "user_oauth"

    id           = Column(Integer,     primary_key=True, autoincrement=True)
    user_id      = Column(String(40),  ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    provider     = Column(String(5),   nullable=False)   # KKO / NVR / GGL
    provider_sub = Column(String(255), nullable=False)   # provider 측 고유 ID
    linked_at    = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("provider", "provider_sub", name="uq_oauth_provider_sub"),
    )


class UserPreference(Base):
    """맞춤 정보. 여행 성향 및 앱 UI 설정."""
    __tablename__ = "user_preference"

    user_id             = Column(String(40), ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    travel_style        = Column(String(50), nullable=True)   # 감성 / 맛집 중심 / 액티비티 등
    transport_type      = Column(String(50), nullable=True)   # 대중교통 / 렌터카 / 도보 등
    preferred_food      = Column(JSONB,      nullable=True)   # ["한식", "카페", ...]
    schedule_density    = Column(String(20), nullable=True)   # 여유 / 보통 / 빡빡
    companion_type      = Column(String(30), nullable=True)   # 혼자 / 커플 / 가족 / 친구
    personalized_topics = Column(JSONB,      nullable=True)   # AI 추출 관심 키워드 목록
    ui_settings         = Column(JSONB,      nullable=True)   # {"theme": "dark", "sidebar_width": 300, ...}
    updated_at          = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class AuthToken(Base):
    """이메일 인증 및 비밀번호 재설정 토큰. 원본 토큰은 이메일 발송, DB에는 해시만 저장."""
    __tablename__ = "auth_tokens"

    token_id   = Column(Integer,      primary_key=True, autoincrement=True)
    email      = Column(String(255),  nullable=False)
    token_hash = Column(String(255),  nullable=False)
    token_type = Column(String(20),   nullable=False)   # email_verify / password_reset
    expires_at = Column(TIMESTAMP(timezone=True), nullable=False)
    used_at    = Column(TIMESTAMP(timezone=True), nullable=True)   # NULL이면 미사용
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())


class RefreshToken(Base):
    """JWT 리프레시 토큰. 원본은 httpOnly 쿠키, DB에는 해시만 저장."""
    __tablename__ = "refresh_tokens"

    token_id   = Column(Integer,     primary_key=True, autoincrement=True)
    user_id    = Column(String(40),  ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(255), nullable=False)
    user_agent = Column(Text,        nullable=True)    # 접속 기기 및 브라우저 정보
    expires_at = Column(TIMESTAMP(timezone=True), nullable=False)
    revoked_at = Column(TIMESTAMP(timezone=True), nullable=True)   # NULL이면 유효
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
