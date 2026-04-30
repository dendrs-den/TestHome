import os
import shutil
from pathlib import Path

from services.storage import StorageService
from ui.app import run_app


def get_user_data_path() -> Path:
    appdata = os.getenv("APPDATA")
    if appdata:
        return Path(appdata) / "PlantCareApp" / "data.json"
    return Path.home() / ".plant_care_app" / "data.json"


def migrate_legacy_data(user_data_path: Path) -> None:
    legacy_path = Path(__file__).resolve().parent / "data.json"
    if user_data_path.exists() or not legacy_path.exists():
        return
    user_data_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(legacy_path, user_data_path)


def main() -> None:
    data_path = get_user_data_path()
    migrate_legacy_data(data_path)

    storage = StorageService(data_path)
    storage.load()
    run_app(storage)


if __name__ == "__main__":
    main()
