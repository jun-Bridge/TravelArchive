import os
import sys
import random
import asyncio
import uuid
from typing import List, Dict, Optional
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# ==========================================
# 기본 경로 및 업로드/다운로드 폴더 설정
# ==========================================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
EXPORT_DIR = os.path.join(BASE_DIR, "exports")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(EXPORT_DIR, exist_ok=True)

load_dotenv(os.path.join(BASE_DIR, "setting", ".env"))

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse, PlainTextResponse
from fastapi import FastAPI, UploadFile, File, Request, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import date

from .test_agent import TestNode
from .session_container import SessionContainer
from module.node.memory.postgres_manager import PostgresManager
from module.node.memory.redis_manager import RedisManager
from .auth import auth_service
from .auth.dependencies import get_current_user, get_current_member, get_optional_user


# ==========================================
# 전역 상태 관리 (DB 매니저 초기화)
# ==========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 앱 시작 시 DB 연결 초기화
    postgres = PostgresManager()
    redis = RedisManager()

    # postgres_tables의 모델 등록
    from module.node.memory.postgres_tables import (
        User, UserProfile, UserSecurity, UserOAuth, UserPreference, Base
    )
    postgres.register_model("User", User)
    postgres.register_model("UserProfile", UserProfile)
    postgres.register_model("UserSecurity", UserSecurity)
    postgres.register_model("UserOAuth", UserOAuth)
    postgres.register_model("UserPreference", UserPreference)

    # 데이터베이스 테이블 생성
    postgres.create_tables(Base.metadata)

    app.state.postgres = postgres
    app.state.redis = redis
    print("[Backend] PostgreSQL & Redis 매니저 초기화 완료")
    yield
    # 앱 종료 시 정리
    print("[Backend] 앱 종료 중...")


app = FastAPI(title="TravelArchive API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 세션 메모리 관리 (인메모리)
# ==========================================
active_sessions: Dict[str, SessionContainer] = {}
current_active_session_id: Optional[str] = None

mock_trip_ranges: Dict[str, List[Dict]] = {}
mock_memos: Dict[str, Dict[str, str]] = {}
mock_plans: Dict[str, Dict[str, List]] = {}
mock_map_markers: Dict[str, Dict[str, Dict]] = {}

# ==========================================
# Pydantic 요청 모델
# ==========================================
class SignUpRequest(BaseModel):
    email: str
    password: str
    nickname: str = ""

class LoginRequest(BaseModel):
    id: str  # 이메일
    pw: str  # 비밀번호

class RefreshRequest(BaseModel):
    refresh_token: str

class LogoutRequest(BaseModel):
    refresh_token: str

class SessionCreateRequest(BaseModel):
    first_message: str
    mode: str = "personal"

class MessageRequest(BaseModel):
    message: str

class ThemeRequest(BaseModel):
    theme: str

class TitleUpdateRequest(BaseModel):
    title: str

class SessionModeUpdateRequest(BaseModel):
    mode: str

class InviteRequest(BaseModel):
    user: str

class MapMarkersRequest(BaseModel):
    markers: List[Dict]

class MapMarkerAddRequest(BaseModel):
    marker_id: str
    lat: float
    lng: float
    title: Optional[str] = None

class MemoRequest(BaseModel):
    memo: str

class PlanRequest(BaseModel):
    plan: List[Dict]

class TripRangeRequest(BaseModel):
    ranges: List[Dict]

# ==========================================
# 인증 API 라우터
# ==========================================

@app.post("/api/auth/signup")
async def signup(req: SignUpRequest, request: Request):
    """자체 계정 회원가입"""
    postgres = request.app.state.postgres
    result = await auth_service.signup(postgres, {
        "email": req.email,
        "password": req.password,
        "nickname": req.nickname,
    })
    return result

@app.post("/api/auth/login")
async def login(req: LoginRequest, request: Request):
    """자체 계정 로그인"""
    postgres = request.app.state.postgres
    redis = request.app.state.redis
    result = await auth_service.login(postgres, redis, req.id, req.pw)
    return result

@app.post("/api/auth/guest")
async def guest_login(request: Request):
    """게스트 로그인"""
    redis = request.app.state.redis
    result = await auth_service.guest_login(redis)
    return result

@app.post("/api/auth/refresh")
async def refresh(req: RefreshRequest, request: Request):
    """토큰 갱신"""
    redis = request.app.state.redis
    result = await auth_service.refresh_token_service(redis, req.refresh_token)
    return result

@app.post("/api/auth/logout")
async def logout(req: LogoutRequest, request: Request):
    """로그아웃"""
    redis = request.app.state.redis
    await auth_service.logout(redis, req.refresh_token)
    return {"status": "success", "message": "로그아웃 되었습니다"}

@app.post("/api/auth/social/{provider}")
async def social_login(provider: str):
    """SNS 로그인 (구현 예정)"""
    return {"status": "not_implemented", "provider": provider, "message": "Phase 7에서 구현 예정"}

@app.post("/api/auth/find")
async def find_account():
    """계정 찾기 (구현 예정)"""
    return {"status": "not_implemented", "message": "구현 예정"}

# ==========================================
# 컨텍스트 및 설정 API
# ==========================================

@app.get("/api/context")
async def get_app_context():
    return {
        "today": date.today().isoformat(),
        "settings": {
            "appGlassOpacity": "20",
            "leftSidebarCustomWidth": 300,
            "rightSidebarCustomWidth": 300,
            "theme": "default"
        }
    }

@app.post("/api/settings/update")
async def update_settings(settings: Dict[str, str], request: Request):
    user_id: str = Depends(get_optional_user)
    print(f"[Backend] {user_id}의 설정 업데이트: {settings}")
    return {"status": "success"}

@app.get("/api/settings")
async def get_settings(user_id: str = Depends(get_optional_user)):
    return {"status": "success", "data": "설정 페이지입니다."}

@app.get("/api/auth/me")
async def get_my_info(request: Request, user_id: str = Depends(get_current_user)):
    """현재 로그인된 사용자 정보 조회 (인증 필수)"""
    user_type = user_id.split(":")[0]

    if user_type == "GST":
        return {
            "status": "success",
            "user_id": user_id,
            "user_type": "GST",
            "nickname": "게스트",
            "email": None
        }

    postgres = request.app.state.postgres
    result = await postgres.execute({
        "action": "read",
        "model": "UserProfile",
        "filters": {"user_id": user_id}
    })

    if result.get("status") == "success" and result.get("data"):
        profile = result["data"][0]
        return {
            "status": "success",
            "user_id": user_id,
            "user_type": user_type,
            "nickname": profile.get("nickname", ""),
            "email": profile.get("email", "")
        }

    raise HTTPException(status_code=404, detail="사용자 정보를 찾을 수 없습니다")

@app.get("/api/account")
async def get_account_info(request: Request, user_id: str = Depends(get_optional_user)):
    """계정 정보 조회 (인증 선택적)"""
    if not user_id:
        return {"status": "guest", "user_id": None, "user_type": None}

    user_type = user_id.split(":")[0]

    if user_type == "GST":
        return {
            "status": "success",
            "user_id": user_id,
            "user_type": "GST",
            "nickname": "게스트",
            "email": None
        }

    postgres = request.app.state.postgres
    result = await postgres.execute({
        "action": "read",
        "model": "UserProfile",
        "filters": {"user_id": user_id}
    })

    if result.get("status") == "success" and result.get("data"):
        profile = result["data"][0]
        return {
            "status": "success",
            "user_id": user_id,
            "user_type": user_type,
            "nickname": profile.get("nickname", ""),
            "email": profile.get("email", "")
        }

    return {"status": "success", "user_id": user_id, "user_type": user_type}

@app.get("/api/help")
async def get_help_data():
    return {"status": "success", "data": "도움말 가이드라인 페이지입니다."}

@app.post("/api/theme")
async def save_theme_preference(req: ThemeRequest, user_id: str = Depends(get_optional_user)):
    print(f"[Backend] {user_id}의 테마 저장: {req.theme}")
    return {"status": "success"}

@app.get("/api/weather")
async def get_weather():
    weather_types = ['clear', 'cloudy', 'rain', 'night']
    selected_weather = random.choice(weather_types)
    return {
        "type": selected_weather,
        "params": {
            "intensity": round(random.uniform(0.2, 1.5), 2),
            "windDirection": round(random.uniform(-1.0, 1.0), 2),
            "cloudDensity": random.randint(3, 10),
            "starDensity": random.randint(100, 300)
        }
    }

# ==========================================
# 세션 관리 API (Mock 유지, 나중에 DB로 전환)
# ==========================================

@app.get("/api/sessions")
async def get_session_list(
    mode: str = "personal",
    user_id: str = Depends(get_current_user)
):
    """세션 목록 조회 (인증 필수)"""
    # TODO: 실제 DB 조회로 전환 필요
    return {"sessions": [], "mode": mode, "user_id": user_id}

@app.post("/api/sessions")
async def create_session(
    req: SessionCreateRequest,
    request: Request,
    user_id: str = Depends(get_current_user)
):
    """새 세션 생성"""
    global current_active_session_id

    session_id = "session_" + str(uuid.uuid4())[:8]
    title = req.first_message[:20] + "..." if len(req.first_message) > 20 else req.first_message

    new_container = SessionContainer(
        session_id=session_id,
        user_id=user_id,
        db_interface=MockDBInterface()
    )
    await new_container.initialize_session(is_new=True)

    active_sessions[session_id] = new_container
    current_active_session_id = session_id

    return {
        "id": session_id,
        "title": title,
        "mode": req.mode,
        "user_id": user_id,
        "created_at": date.today().isoformat()
    }

@app.put("/api/sessions/{session_id}/mode")
async def update_session_mode(
    session_id: str,
    req: SessionModeUpdateRequest,
    user_id: str = Depends(get_current_user)
):
    print(f"[Backend] {user_id}: 세션 {session_id} 모드 변경: {req.mode}")
    return {"success": True, "mode": req.mode}

@app.post("/api/sessions/{session_id}/invite")
async def invite_user(
    session_id: str,
    req: InviteRequest,
    user_id: str = Depends(get_current_user)
):
    print(f"[Backend] {user_id}: 세션 {session_id} 유저 초대: {req.user}")
    return {"success": True, "user": req.user}

@app.post("/api/sessions/{session_id}/share")
async def share_chat(
    session_id: str,
    user_id: str = Depends(get_current_user)
):
    return {"success": True, "share_url": f"http://localhost/share/{session_id}"}

@app.put("/api/sessions/{session_id}/title")
async def update_session_title(
    session_id: str,
    req: TitleUpdateRequest,
    user_id: str = Depends(get_current_user)
):
    print(f"[Backend] {user_id}: 세션 {session_id} 제목 변경: {req.title}")
    return {"success": True, "title": req.title}

@app.delete("/api/sessions/{session_id}")
async def delete_session(
    session_id: str,
    user_id: str = Depends(get_current_user)
):
    """세션 삭제"""
    global current_active_session_id

    if session_id in active_sessions:
        del active_sessions[session_id]
        if current_active_session_id == session_id:
            current_active_session_id = None

    print(f"[Backend] {user_id}: 세션 {session_id} 삭제")
    return {"success": True, "message": f"세션 {session_id} 삭제 완료"}

# ==========================================
# 메시지 API
# ==========================================

@app.get("/api/sessions/{session_id}/history")
async def get_chat_history(
    session_id: str,
    user_id: str = Depends(get_current_user)
):
    """채팅 기록 조회"""
    if session_id in active_sessions:
        history = await active_sessions[session_id].get_full_history()
        return history
    return {"messages": []}

@app.post("/api/sessions/{session_id}/message")
async def send_message(
    session_id: str,
    req: MessageRequest,
    request: Request,
    user_id: str = Depends(get_current_user)
):
    """메시지 전송 (스트리밍)"""
    global current_active_session_id

    if current_active_session_id != session_id:
        if current_active_session_id and current_active_session_id in active_sessions:
            await active_sessions[current_active_session_id].teardown()
            del active_sessions[current_active_session_id]

        if session_id not in active_sessions:
            new_container = SessionContainer(
                session_id=session_id,
                user_id=user_id,
                db_interface=MockDBInterface()
            )
            await new_container.initialize_session(is_new=False)
            active_sessions[session_id] = new_container

        current_active_session_id = session_id

    container = active_sessions[session_id]

    async def response_generator():
        response_text = await container.process_user_input(req.message)
        for char in response_text:
            yield char
            await asyncio.sleep(0.03)

    return StreamingResponse(response_generator(), media_type="text/plain")

@app.get("/api/sessions/{session_id}/download")
async def download_chat(
    session_id: str,
    user_id: str = Depends(get_current_user)
):
    """채팅 다운로드"""
    if session_id in active_sessions:
        history = await active_sessions[session_id].get_full_history()
    else:
        history = []

    content = f"--- 대화 기록 ({session_id}) ---\n"
    for msg in history:
        role = "사용자" if msg.get("role") == "user" else "봇"
        content += f"[{role}]\n{msg.get('content', '')}\n\n"

    headers = {"Content-Disposition": f"attachment; filename=chat_{session_id}.txt"}
    return PlainTextResponse(content, headers=headers)

# ==========================================
# 파일 업로드 API
# ==========================================

@app.post("/api/sessions/{session_id}/files")
async def upload_files(
    session_id: str,
    files: List[UploadFile] = File(...),
    user_id: str = Depends(get_current_user)
):
    """파일 업로드"""
    file_names = []
    for file in files:
        file_location = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_location, "wb+") as file_object:
            file_object.write(await file.read())
        file_names.append(file.filename)

    print(f"[Backend] {user_id}: 세션 {session_id} 파일 업로드: {file_names}")
    return {"success": True, "uploaded_files": file_names}

# ==========================================
# 지도 API
# ==========================================

@app.post("/api/sessions/{session_id}/map/markers/add")
async def add_map_marker(
    session_id: str,
    req: MapMarkerAddRequest,
    user_id: str = Depends(get_current_user)
):
    if session_id not in mock_map_markers:
        mock_map_markers[session_id] = {}
    mock_map_markers[session_id][req.marker_id] = {
        "marker_id": req.marker_id,
        "lat": req.lat,
        "lng": req.lng,
        "title": req.title or ""
    }
    print(f"[Backend] {user_id}: 마커 추가 - {req.marker_id}")
    return {"success": True, "marker_id": req.marker_id}

@app.delete("/api/sessions/{session_id}/map/markers/{marker_id}")
async def delete_map_marker(
    session_id: str,
    marker_id: str,
    user_id: str = Depends(get_current_user)
):
    removed = False
    if session_id in mock_map_markers and marker_id in mock_map_markers[session_id]:
        del mock_map_markers[session_id][marker_id]
        removed = True
    print(f"[Backend] {user_id}: 마커 삭제 - {marker_id}")
    return {"success": True, "removed": removed}

@app.post("/api/sessions/{session_id}/map/markers")
async def save_map_markers(
    session_id: str,
    req: MapMarkersRequest,
    user_id: str = Depends(get_current_user)
):
    if session_id not in mock_map_markers:
        mock_map_markers[session_id] = {}
    for m in req.markers:
        mid = m.get("marker_id") or m.get("id")
        if mid:
            mock_map_markers[session_id][mid] = {
                "marker_id": mid,
                "lat": m.get("lat", 0),
                "lng": m.get("lng", 0),
                "title": m.get("title", "")
            }
    return {"success": True}

@app.get("/api/sessions/{session_id}/map/markers")
async def get_map_markers(
    session_id: str,
    user_id: str = Depends(get_current_user)
):
    markers = list(mock_map_markers.get(session_id, {}).values())
    return {"markers": markers}

# ==========================================
# 여행 일정 API
# ==========================================

@app.put("/api/sessions/{session_id}/trip_range")
async def save_trip_range(
    session_id: str,
    req: TripRangeRequest,
    user_id: str = Depends(get_current_user)
):
    mock_trip_ranges[session_id] = req.ranges
    return {"success": True}

@app.get("/api/sessions/{session_id}/trip_range")
async def get_trip_range(
    session_id: str,
    user_id: str = Depends(get_current_user)
):
    return {"ranges": mock_trip_ranges.get(session_id, [])}

# ==========================================
# 메모 및 플래너 API
# ==========================================

@app.put("/api/sessions/{session_id}/memo")
async def save_memo(
    session_id: str,
    date: str,
    req: MemoRequest,
    user_id: str = Depends(get_current_user)
):
    if session_id not in mock_memos:
        mock_memos[session_id] = {}
    mock_memos[session_id][date] = req.memo
    return {"success": True}

@app.get("/api/sessions/{session_id}/memo")
async def get_memo(
    session_id: str,
    date: str,
    user_id: str = Depends(get_current_user)
):
    memo = mock_memos.get(session_id, {}).get(date, "")
    return {"memo": memo}

@app.put("/api/sessions/{session_id}/plan")
async def save_plan(
    session_id: str,
    date: str,
    req: PlanRequest,
    user_id: str = Depends(get_current_user)
):
    if session_id not in mock_plans:
        mock_plans[session_id] = {}
    mock_plans[session_id][date] = req.plan
    return {"success": True}

@app.get("/api/sessions/{session_id}/plan")
async def get_plan(
    session_id: str,
    date: str,
    user_id: str = Depends(get_current_user)
):
    plan = mock_plans.get(session_id, {}).get(date, [])
    return {"plan": plan}

@app.get("/api/sessions/{session_id}/indicators")
async def get_indicators(
    session_id: str,
    year: int,
    month: int,
    user_id: str = Depends(get_current_user)
):
    memo_dates = mock_memos.get(session_id, {}).keys()
    plan_dates = mock_plans.get(session_id, {}).keys()
    unique_dates = list(set(list(memo_dates) + list(plan_dates)))
    prefix = f"{year}-{month:02d}-"
    return [d for d in unique_dates if d.startswith(prefix)]

# ==========================================
# Static Files & 뷰 라우터
# ==========================================

RESOURCE_DIR = os.path.join(BASE_DIR, "resource")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

@app.get("/")
async def read_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

app.mount("/resource", StaticFiles(directory=RESOURCE_DIR), name="resource")
app.mount("/", StaticFiles(directory=FRONTEND_DIR), name="frontend")

# ==========================================
# Mock DB Interface (세션용, 향후 DB 전환)
# ==========================================

class MockDBInterface:
    async def load_personalization(self, user_id: str) -> str:
        await asyncio.sleep(0.05)
        return "사용자는 조용한 장소와 자연 경관을 선호합니다."

    async def load_session_data(self, session_id: str) -> dict:
        await asyncio.sleep(0.05)
        return {}

    async def append_messages(self, session_id: str, messages: List[dict]):
        await asyncio.sleep(0.05)

    async def save_session_state(self, session_id: str, topic: str, name: str, context: str, is_manual_title: bool):
        await asyncio.sleep(0.05)

    async def get_chat_history(self, session_id: str) -> List[dict]:
        await asyncio.sleep(0.05)
        return []

async def mock_db_get_session_list() -> List[dict]:
    return []

async def mock_db_create_session(first_message: str) -> dict:
    new_id = f"session_{uuid.uuid4().hex[:9]}"
    title = first_message[:20] + "..." if len(first_message) > 20 else first_message
    return {"id": new_id, "title": title}

async def mock_db_get_chat_history(session_id: str) -> List[dict]:
    return []
