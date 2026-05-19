"""
port1.py
P1 포트 — 단방향 (Port1 → Core)

컨테이너 인스턴스에서 직접 꺼냄. Redis 없음. async 없음.
"""

from __future__ import annotations

import json
from typing import TYPE_CHECKING

from .protocol import PC1

if TYPE_CHECKING:
    from ..execute_unit.chat.chat_session_container import SessionContainer


class Port1:

    def __init__(self, container: "SessionContainer", user_analysis: str) -> None:
        self._container     = container
        self._user_analysis = user_analysis

    def request_pc1(self) -> PC1:
        return PC1(
            USR_ANAL=self._user_analysis,
            SSN_TPC=self._container.session_topic,
            SSN_PCL=json.dumps(self._container.past_messages, ensure_ascii=False),
        )
