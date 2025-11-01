import os, sys
# Ensure '/app' is on sys.path for imports when running under Gunicorn
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app import create_app
app = create_app()
