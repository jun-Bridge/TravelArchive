"""
port2.py
P2 포트 — 양방향 (P2 ↔ Core)

역할:
  - current_chat, trip_select, trip_clander, trip_map, trip_marker, trip_plan 어댑터 창구 보유
  - 사용자 메시지(CC) 수신 → PC2 조립 → Core 전달
  - Core 출력(PC2') 수신 → 각 어댑터에 갱신 분배
  - 내부 로직은 추후 채울 것

어댑터 매핑:
  _get/_set_cc()   → current_chat  (chat 영역)
  _get/_set_t_sl() → trip_select   (widget 영역)
  _get/_set_t_cd() → trip_clander  (widget 영역)
  _get/_set_t_mp() → trip_map      (widget 영역)
  _get/_set_t_mk() → trip_marker   (widget 영역)
  _get/_set_t_pn() → trip_plan     (widget 영역)
"""

from __future__ import annotations
from typing import TYPE_CHECKING
from protocol import PC2

if TYPE_CHECKING:
    from core import Core


class Port2:

    def __init__(self, core: "Core"):
        self.core = core

    # ═══════════════════════════════════════════════
    # P2 → Core 인터페이스
    # 트리거: 사용자 메시지(CC) 수신 시
    # ═══════════════════════════════════════════════

    async def on_user_message(self, user_input: str) -> None:
        """
        사용자 메시지 수신 → PC2 조립 → Core 전달.
        """
        pc2 = await self._build_pc2(user_input)
        await self.core.receive_from_p2(pc2)

    async def _build_pc2(self, user_input: str) -> PC2:
        """각 어댑터에서 현재 상태 수집 후 PC2 조립"""
        return PC2(
            CC=user_input,
            T_SL=await self._get_t_sl(),   # trip_select
            T_CD=await self._get_t_cd(),   # trip_clander
            T_MP=await self._get_t_mp(),   # trip_map
            T_MK=await self._get_t_mk(),   # trip_marker
            T_PN=await self._get_t_pn(),   # trip_plan
        )

    # ═══════════════════════════════════════════════
    # Core → P2 인터페이스
    # Core split 결과 수신 → 각 어댑터 갱신
    # ═══════════════════════════════════════════════

    async def receive_from_core(self, pc2: PC2) -> None:
        """
        Core로부터 PC2' 수신 → 어댑터별 갱신 분배.
        Core가 이미 diff 비교 후 변경된 값만 넘기므로,
        P2는 받은 값을 그대로 각 어댑터에 set.
        """
        await self._set_cc(pc2.CC)         # current_chat — 무조건 (사용자 표시)
        await self._set_t_sl(pc2.T_SL)     # trip_select
        await self._set_t_cd(pc2.T_CD)     # trip_clander
        await self._set_t_mp(pc2.T_MP)     # trip_map
        await self._set_t_mk(pc2.T_MK)     # trip_marker
        await self._set_t_pn(pc2.T_PN)     # trip_plan

    async def on_error(self, msg: str) -> None:
        """Core로부터 에러 수신"""
        raise NotImplementedError

    # ═══════════════════════════════════════════════
    # 어댑터 창구 함수
    # 내부 로직은 추후 채울 것
    # ═══════════════════════════════════════════════

    # 읽기 (P2 → Core)
    async def _get_t_sl(self) -> str:              raise NotImplementedError  # trip_select
    async def _get_t_cd(self) -> list:             raise NotImplementedError  # trip_clander
    async def _get_t_mp(self) -> list:             raise NotImplementedError  # trip_map
    async def _get_t_mk(self) -> list:             raise NotImplementedError  # trip_marker
    async def _get_t_pn(self) -> list:             raise NotImplementedError  # trip_plan

    # 쓰기 (Core → P2)
    async def _set_cc(self,    val: str)  -> None: raise NotImplementedError  # current_chat
    async def _set_t_sl(self,  val: str)  -> None: raise NotImplementedError  # trip_select
    async def _set_t_cd(self,  val: list) -> None: raise NotImplementedError  # trip_clander
    async def _set_t_mp(self,  val: list) -> None: raise NotImplementedError  # trip_map
    async def _set_t_mk(self,  val: list) -> None: raise NotImplementedError  # trip_marker
    async def _set_t_pn(self,  val: list) -> None: raise NotImplementedError  # trip_plan
