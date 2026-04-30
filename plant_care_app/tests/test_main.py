from __future__ import annotations

from pathlib import Path

import main as main_module


class DummyStorage:
    def __init__(self, data_path: Path) -> None:
        self.data_path = data_path
        self.loaded = False

    def load(self) -> None:
        self.loaded = True


def test_main_wires_storage_and_ui(monkeypatch) -> None:
    captured: dict[str, object] = {}

    def fake_storage_ctor(path: Path) -> DummyStorage:
        storage = DummyStorage(path)
        captured["storage"] = storage
        return storage

    def fake_run_app(storage: DummyStorage) -> None:
        captured["run_app_storage"] = storage

    monkeypatch.setattr(main_module, "StorageService", fake_storage_ctor)
    monkeypatch.setattr(main_module, "run_app", fake_run_app)

    main_module.main()

    storage = captured["storage"]
    assert isinstance(storage, DummyStorage)
    assert storage.loaded is True
    assert captured["run_app_storage"] is storage
    assert storage.data_path.name == "data.json"


def test_main_module_runs_as_script(monkeypatch) -> None:
    import runpy
    import sys
    import types

    calls = {"loaded": False, "run_app": False}

    class DummyStorage:
        def __init__(self, _path):
            pass

        def load(self):
            calls["loaded"] = True

    fake_storage_module = types.ModuleType("services.storage")
    fake_storage_module.StorageService = DummyStorage

    fake_ui_module = types.ModuleType("ui.app")

    def fake_run_app(_storage):
        calls["run_app"] = True

    fake_ui_module.run_app = fake_run_app

    monkeypatch.setitem(sys.modules, "services.storage", fake_storage_module)
    monkeypatch.setitem(sys.modules, "ui.app", fake_ui_module)

    runpy.run_module("main", run_name="__main__")

    assert calls == {"loaded": True, "run_app": True}
