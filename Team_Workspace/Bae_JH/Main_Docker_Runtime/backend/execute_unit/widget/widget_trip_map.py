class TripMapWidget:
    def __init__(self) -> None:
        self.value: list = []

    def get(self) -> list:
        return self.value

    def set(self, value: list) -> None:
        self.value = value
