"""
core.py
라우터 코어

역할:
  - P1/P2 수신 → merge → PC3 조립 → P3 전달
  - P3 출력 수신 → split → PC2 추출 → P2 전달
  - P1/P2/P3와 통신하는 인터페이스 함수 보유
  - 어댑터 내부 동작 모름, 포트 인터페이스로만 통신
"""

from __future__ import annotations
from typing import TYPE_CHECKING
from protocol import PC1, PC2, PC3

if TYPE_CHECKING:
    from port1 import Port1
    from port2 import Port2
    from port3 import Port3


class Core:

    def __init__(self, p1: "Port1", p2: "Port2", p3: "Port3"):
        self.p1 = p1
        self.p2 = p2
        self.p3 = p3
        self._prev_pc2: PC2 = PC2()   # diff 비교용 이전 PC2 저장

    # ═══════════════════════════════════════════════
    # 인터페이스 함수 — P2 → Core
    # ═══════════════════════════════════════════════

    async def receive_from_p2(self, pc2: PC2) -> None:
        """
        P2로부터 PC2 수신.
        CC 수신이 트리거 → merge 시작.
        """
        await self._merge_and_execute(pc2)

    # ═══════════════════════════════════════════════
    # 인터페이스 함수 — P3 → Core
    # ═══════════════════════════════════════════════

    async def receive_from_p3(self, pc3_result: PC3) -> None:
        """
        P3로부터 PC3 수신 (LLM 출력).
        split → P2 전달.
        """
        await self._split_and_send(pc3_result)

    # ═══════════════════════════════════════════════
    # MERGE 내부 로직
    # ═══════════════════════════════════════════════

    async def _merge_and_execute(self, pc2: PC2) -> None:
        """
        STEP 1. P1에 PC1 요청
        STEP 2. PC1 + PC2 → PC3 조립
        STEP 3. validate
        STEP 4. P3 전달
        """
        # STEP 1 — P1에 PC1 요청 (P1이 push)
        pc1: PC1 = await self.p1.request_pc1()

        # STEP 2 — merge
        pc3: PC3 = self._merge(pc1, pc2)

        # STEP 3 — validate
        if not self._validate_pc3(pc3):
            await self.p2.on_error("Core: CC 누락 — PC3 구성 실패")
            return

        # STEP 4 — P3 전달
        await self.p3.execute(pc3)

    def _merge(self, pc1: PC1, pc2: PC2) -> PC3:
        """PC1 + PC2 필드를 하나의 PC3로 합산"""
        return PC3(
            # PC1 필드
            USR_ANAL=pc1.USR_ANAL,
            SSN_TPC=pc1.SSN_TPC,
            SSN_PCL=pc1.SSN_PCL,
            # PC2 필드
            CC=pc2.CC,
            T_SL=pc2.T_SL,
            T_CD=pc2.T_CD,
            T_MP=pc2.T_MP,
            T_MK=pc2.T_MK,
            T_PN=pc2.T_PN,
        )

    def _validate_pc3(self, pc3: PC3) -> bool:
        """필수 키 확인 — CC는 반드시 있어야 함"""
        return bool(pc3.CC)

    # ═══════════════════════════════════════════════
    # SPLIT 내부 로직
    # ═══════════════════════════════════════════════

    async def _split_and_send(self, pc3_result: PC3) -> None:
        """
        STEP 1. PC1 필드 제거
        STEP 2. CC → P2 무조건 전달
        STEP 3. T_SL → 선택지 신호 판단
        STEP 4. T_CD/MP/MK/PN → diff 비교 후 갱신
        STEP 5. PC2' → P2 전달
        """
        pc2_new = PC2(
            CC=pc3_result.CC,
            T_SL=pc3_result.T_SL,
            T_CD=self._diff_or_keep(pc3_result.T_CD, self._prev_pc2.T_CD),
            T_MP=self._diff_or_keep(pc3_result.T_MP, self._prev_pc2.T_MP),
            T_MK=self._diff_or_keep(pc3_result.T_MK, self._prev_pc2.T_MK),
            T_PN=self._diff_or_keep(pc3_result.T_PN, self._prev_pc2.T_PN),
        )

        # 현재 PC2 저장 (다음 diff 비교용)
        self._prev_pc2 = pc2_new

        # P2 전달
        await self.p2.receive_from_core(pc2_new)

    def _diff_or_keep(self, new_val, old_val):
        """
        diff 비교 규칙:
          - new_val이 기본값(빈 리스트)이면 → old_val 유지
          - new_val != old_val 이면 → new_val 갱신
          - 같으면 → old_val 유지
        """
        if not new_val:          # 기본값 → 스킵
            return old_val
        if new_val != old_val:   # 변경됨 → 갱신
            return new_val
        return old_val           # 동일 → 유지
