"""
port3.py
P3 포트 — 양방향 (P3 ↔ Core)

역할:
  - sDB, dDB, PPL, LLM 어댑터 창구 보유
  - Core로부터 PC3 수신 → 내부 처리(@plan 분기, 버퍼, LLM) → PC3 반환
  - 내부 상세 로직(@plan, 버퍼, 병렬처리)은 추후 채울 것
"""

from __future__ import annotations
from typing import TYPE_CHECKING, List
from protocol import PC3, QUST, sDB_Item, dDB_Item, LLM_Response

if TYPE_CHECKING:
    from core import Core


class Port3:

    def __init__(self, core: "Core"):
        self.core = core

    # ═══════════════════════════════════════════════
    # Core ↔ P3 인터페이스
    # ═══════════════════════════════════════════════

    async def execute(self, pc3: PC3) -> None:
        """
        Core로부터 PC3 수신 → 내부 처리 → Core에 결과 반환.
        @plan 감지/버퍼/LLM 로직은 내부에서 처리.
        """
        pc3_result: PC3 = await self._process(pc3)
        await self.core.receive_from_p3(pc3_result)

    async def _process(self, pc3: PC3) -> PC3:
        """
        P3 내부 처리 로직.
        담당자가 채울 것:
          - @plan 감지 및 제거
          - 일반 모드: LLM만 호출
          - 계획 모드: sDB/dDB/PPL 병렬 실행 → 버퍼(QUST) → LLM
        """
        raise NotImplementedError

    # ═══════════════════════════════════════════════
    # 어댑터 창구 함수 (sDB / dDB / PPL / LLM)
    # 내부 로직은 추후 채울 것
    # ═══════════════════════════════════════════════

    async def _call_sdb(self, query: str) -> List[sDB_Item]:
        """sDB — 정적DB (PostGIS) 조회"""
        raise NotImplementedError

    async def _call_ddb(self, query: str) -> List[dDB_Item]:
        """dDB — 동적DB (날씨 API) 조회"""
        raise NotImplementedError

    async def _call_ppl(self, query: str) -> str:
        """PPL — Perplexity 호출"""
        raise NotImplementedError

    async def _call_llm(self, qust: QUST) -> LLM_Response:
        """LLM(GPT) 호출, LLM_Response 반환"""
        raise NotImplementedError
