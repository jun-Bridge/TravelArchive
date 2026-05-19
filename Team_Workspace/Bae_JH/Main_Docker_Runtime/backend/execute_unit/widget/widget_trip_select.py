class TripSelectWidget:
    def __init__(self) -> None:
        self.value: str = ""

    def get(self) -> str:
        return self.value

    def set(self, value: str) -> None:
        self.value = value
