"""
Local Disk Storage Service
Saves screenshots/heatmaps to local disk under outputs/.
(Same convention as ../backend/services/storage.py, kept independent on purpose
so this backend has no runtime dependency on the existing one.)
"""

from pathlib import Path
from config import settings


def upload_image(image_bytes: bytes, filename: str, folder: str = "ux-intel-agent") -> str:
    return _save_to_disk(image_bytes, filename, folder)


def _save_to_disk(image_bytes: bytes, filename: str, folder: str) -> str:
    if "screenshot" in folder or "screenshot" in filename:
        base_dir = Path(settings.screenshots_dir)
    else:
        base_dir = Path(settings.heatmaps_dir)

    base_dir.mkdir(parents=True, exist_ok=True)
    path = base_dir / filename
    path.write_bytes(image_bytes)
    print(f"[storage] Local save -> {path}")
    return str(path)
