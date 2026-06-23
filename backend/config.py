from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    # AI (OpenAI / ChatGPT only — this backend does not use Gemini)
    openai_api_key: str = ""

    # Screenshot API (fallback when Selenium/Playwright are unavailable)
    thumio_api_key: str = ""

    # Storage paths (relative to backend/) — local disk only, no cloud storage
    screenshots_dir: str = "outputs/screenshots"
    heatmaps_dir: str = "outputs/heatmaps"

    # Server
    host: str = "0.0.0.0"
    port: int = 8100
    debug: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def ensure_dirs(self) -> None:
        Path(self.screenshots_dir).mkdir(parents=True, exist_ok=True)
        Path(self.heatmaps_dir).mkdir(parents=True, exist_ok=True)


settings = Settings()
