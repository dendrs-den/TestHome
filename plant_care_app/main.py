from pathlib import Path

from services.storage import StorageService
from ui.app import run_app


def main() -> None:
    root = Path(__file__).resolve().parent
    data_path = root / "data.json"

    storage = StorageService(data_path)
    storage.load()
    run_app(storage)


if __name__ == "__main__":
    main()
