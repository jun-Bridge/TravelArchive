"""
port2.py
P2 포트 — 양방향 (Port2 ↔ Core)

위젯 인스턴스를 직접 받아서 get/set 호출. Redis 없음.
CC 읽기: container.current_message
CC 쓰기: last_response (chat_service가 스트리밍에 사용)
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from .protocol import PC2

if TYPE_CHECKING:
    from .core import Core
    from ..execute_unit.chat.chat_session_container import SessionContainer
    from ..execute_unit.widget.widget_trip_select   import TripSelectWidget
    from ..execute_unit.widget.widget_trip_clander  import TripClanderWidget
    from ..execute_unit.widget.widget_trip_map      import TripMapWidget
    from ..execute_unit.widget.widget_trip_marker   import TripMarkerWidget
    from ..execute_unit.widget.widget_trip_plan     import TripPlanWidget


class Port2:

    def __init__(
        self,
        core:       "Core",
        container:  "SessionContainer",
        t_sl:       "TripSelectWidget",
        t_cd:       "TripClanderWidget",
        t_mp:       "TripMapWidget",
        t_mk:       "TripMarkerWidget",
        t_pn:       "TripPlanWidget",
    ) -> None:
        self.core       = core
        self._container = container
        self._t_sl      = t_sl
        self._t_cd      = t_cd
        self._t_mp      = t_mp
        self._t_mk      = t_mk
        self._t_pn      = t_pn
        self.last_response: str = ""

    async def on_user_message(self) -> None:
        await self.core.receive_from_p2(self._build_pc2())  # _build_pc2 sync, receive_from_p2 async

    def _build_pc2(self) -> PC2:
        msg = self._container.current_message
        return PC2(
            CC=msg["content"] if msg else "",
            T_SL=self._t_sl.get(),
            T_CD=self._t_cd.get(),
            T_MP=self._t_mp.get(),
            T_MK=self._t_mk.get(),
            T_PN=self._t_pn.get(),
        )

    async def receive_from_core(self, pc2: PC2) -> None:
        self.last_response = pc2.CC
        self._t_sl.set(pc2.T_SL)
        self._t_cd.set(pc2.T_CD)
        self._t_mp.set(pc2.T_MP)
        self._t_mk.set(pc2.T_MK)
        self._t_pn.set(pc2.T_PN)

    async def on_error(self, msg: str) -> None:
        self.last_response = f"[라우터 오류] {msg}"
