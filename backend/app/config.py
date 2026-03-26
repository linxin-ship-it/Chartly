import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.deepseek.com")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "deepseek-chat")
MAX_AGENT_STEPS = int(os.getenv("MAX_AGENT_STEPS", "25"))
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/tmp/chartly_uploads")
