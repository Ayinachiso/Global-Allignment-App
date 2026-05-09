"""WSGI entry point for production deployments.

Keeping this in a tiny separate module avoids any surprises when
Render or Gunicorn imports the app.
"""

from app import app
