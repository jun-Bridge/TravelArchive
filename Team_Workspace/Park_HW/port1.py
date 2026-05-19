"""
port1.py
P1 포트 — 단방향 (P1 → Core)

역할:
  - user_analyze, session_topic, past_chat_list 어댑터 창구 보유
  - Core 요청 시 PC1 조립해서 push
  - 내부 로직은 추후 채우기 필요

어댑터 매핑:
  _get_usr_anal() → user_analyze   (user 영역 — 미리 생성된 값, 직접 접근)
  _get_ssn_tpc()  → session_topic  (chat 영역 — 세션 컨테이너)
  _get_ssn_pcl()  → past_chat_list (chat 영역 — 세션 컨테이너)
"""

from __future__ import annotations
from protocol import PC1


class Port1:

    # ═══════════════════════════════════════════════
    # Core ↔ P1 인터페이스
    # ═══════════════════════════════════════════════

    async def request_pc1(self) -> PC1:
        """
        Core가 호출 → PC1 조립 후 반환.
        내부적으로 user_analyze / session_topic / past_chat_list 호출.
        """
        usr_anal = await self._get_usr_anal()   # user_analyze
        ssn_tpc  = await self._get_ssn_tpc()    # session_topic
        ssn_pcl  = await self._get_ssn_pcl()    # past_chat_list

        return PC1(
            USR_ANAL=usr_anal,
            SSN_TPC=ssn_tpc,
            SSN_PCL=ssn_pcl,
        )

    # ═══════════════════════════════════════════════
    # 어댑터 창구 함수
    # 내부 로직은 추후 채울 것
    # ═══════════════════════════════════════════════

    async def _get_usr_anal(self) -> str:
        """user_analyze — 유저 성향 분석 정보 (user 영역, 직접 접근)"""
        raise NotImplementedError

    async def _get_ssn_tpc(self) -> str:
        """session_topic — 세션 주제 (chat 영역, 세션 컨테이너)"""
        raise NotImplementedError

    async def _get_ssn_pcl(self) -> str:
        """past_chat_list — 과거 대화 기록 (chat 영역, 세션 컨테이너)"""
        raise NotImplementedError
