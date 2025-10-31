# Backend/app/services/export_service.py
from __future__ import annotations

import os
import uuid
from typing import Dict, Optional

import pdfkit  # pip install pdfkit
from jinja2 import Environment, FileSystemLoader, select_autoescape

from .fetch_forms import get_patient_export_data


# --------------------------------------------------------------------------------------
# Directories & Jinja environment
# --------------------------------------------------------------------------------------

_THIS_DIR = os.path.dirname(__file__)
EXPORT_DIR = os.path.join(_THIS_DIR, "_exports")
TEMPLATE_DIR = os.path.join(_THIS_DIR, "..", "templates")

os.makedirs(EXPORT_DIR, exist_ok=True)
os.makedirs(TEMPLATE_DIR, exist_ok=True)

env = Environment(
    loader=FileSystemLoader(TEMPLATE_DIR),
    autoescape=select_autoescape(["html", "xml"])
)

# If the packet template doesn't exist, create a default one
_DEFAULT_TEMPLATE_NAME = "patient_packet.html"
_default_template_path = os.path.join(TEMPLATE_DIR, _DEFAULT_TEMPLATE_NAME)

if not os.path.exists(_default_template_path):
    with open(_default_template_path, "w", encoding="utf-8") as f:
        f.write("""<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Patient Form Export</title>
  <style>
    @page { margin: 24mm 18mm; }
    body  { font-family: Arial, Helvetica, sans-serif; color:#222; }
    h1    { color:#214A8D; margin:0 0 6px 0; font-size:28px; }
    h2    { color:#214A8D; font-size:20px; margin:24px 0 8px; }
    .meta { margin: 2px 0; }
    .muted{ color:#666; font-size:12px; }

    table.list { width:100%; border-collapse:collapse; margin-top:8px; }
    table.list th, table.list td { border:1px solid #d9dfe7; padding:8px 10px; font-size:13px; }
    table.list th { background:#f4f6fb; text-align:left; }

    .form-card { border:1px solid #e4e7ee; border-radius:6px; padding:12px 14px; margin:14px 0 24px; }
    .form-title{ font-weight:700; font-size:18px; margin-bottom:4px; }
    .pill { display:inline-block; padding:2px 8px; border-radius:999px; font-size:12px; background:#eef2ff; color:#214A8D; }

    .qa { width:100%; border-collapse:separate; border-spacing:0 6px; margin-top:6px; }
    .qa td.label { width:35%; vertical-align:top; font-weight:600; padding:8px 10px; background:#fafbff; border:1px solid #e7eaf3; border-right:none; }
    .qa td.value { vertical-align:top; padding:8px 10px; border:1px solid #e7eaf3; background:#fff; }

    .empty { padding:10px 12px; border:1px dashed #cfd6e5; color:#6b7280; font-size:13px; background:#fbfdff; }

    .page-break { page-break-after: always; }
  </style>
</head>
<body>

  <h1>Patient Form Export</h1>
  <div class="meta"><b>Name:</b> {{ patient.name or '-' }}</div>
  <div class="meta"><b>Email:</b> {{ patient.email or '-' }}</div>
  <div class="meta"><b>Phone:</b> {{ patient.phone or '-' }}</div>

  <h2>Assigned Forms</h2>
  <table class="list">
    <thead>
      <tr>
        <th>Form Title</th>
        <th>Status</th>
        <th>Submitted</th>
      </tr>
    </thead>
    <tbody>
      {% for f in forms %}
      <tr>
        <td>{{ f.title or ('Form #' ~ f.form_id) }}</td>
        <td>{{ f.display_status }}</td>
        <td>{{ f.submitted_at or '-' }}</td>
      </tr>
      {% endfor %}
    </tbody>
  </table>

  {% for f in forms %}
    <div class="form-card">
      <div class="form-title">
        {{ loop.index }}. {{ f.title or ('Form #' ~ f.form_id) }}
        <span class="pill">{{ f.display_status }}</span>
      </div>
      <div class="muted">
        Submission #{{ f.submission_id or '—' }}{% if f.submitted_at %} • Submitted: {{ f.submitted_at }}{% endif %}
      </div>

      {% if f.responses and f.responses|length > 0 %}
        <table class="qa">
          {% for r in f.responses %}
            <tr>
              <td class="label">{{ r.label or ('Field ' ~ r.field_id) }}</td>
              <td class="value">
                {% if r.type and r.type|lower in ['signature','file'] %}
                  {{ r.response_value or '—' }}
                {% elif r.type and r.type|lower in ['checkbox','boolean'] %}
                  {{ (r.response_value in ['1','true','True','YES','yes']) and 'Yes' or 'No' }}
                {% else %}
                  {{ r.response_value or '—' }}
                {% endif %}
              </td>
            </tr>
          {% endfor %}
        </table>
      {% else %}
        <div class="empty">No responses captured for this form.</div>
      {% endif %}
    </div>

    {% if not loop.last %}
      <div class="page-break"></div>
    {% endif %}
  {% endfor %}

</body>
</html>
""")


# --------------------------------------------------------------------------------------
# wkhtmltopdf config / options
# --------------------------------------------------------------------------------------

def _detect_wkhtmltopdf_exe() -> Optional[str]:
    """
    Try to find wkhtmltopdf on Windows default paths.
    Return full path or None (pdfkit will then try PATH).
    """
    candidates = [
        r"C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe",
        r"C:\Program Files (x86)\wkhtmltopdf\bin\wkhtmltopdf.exe",
        # If you installed the mshtml build name:
        r"C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe",
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None


_WKHTML_EXE = _detect_wkhtmltopdf_exe()
_PDFKIT_CFG = pdfkit.configuration(wkhtmltopdf=_WKHTML_EXE) if _WKHTML_EXE else None

# sensible print options (A4/US Letter friendly)
WKHTML_OPTS: Dict[str, str] = {
    "page-size": "Letter",
    "margin-top": "10mm",
    "margin-bottom": "10mm",
    "margin-left": "10mm",
    "margin-right": "10mm",
    "encoding": "UTF-8",
    "quiet": "",  # suppress wkhtmltopdf console logs
}


# --------------------------------------------------------------------------------------
# Simple in-memory job store
# --------------------------------------------------------------------------------------

_JOBS: Dict[str, Dict[str, Optional[str]]] = {}
# structure: { export_id: {"status": "pending"|"ready"|"error", "path": "c:\\...pdf"} }


# --------------------------------------------------------------------------------------
# Public API used by routes
# --------------------------------------------------------------------------------------

def start_export_job(patient_id: int, view: str) -> str:
    """
    Creates a 'job', generates the PDF synchronously for now, and stores the result path.
    `view` can be "staff" | "patient" — included for future branching.
    """
    export_id = str(uuid.uuid4())
    _JOBS[export_id] = {"status": "pending", "path": None}

    try:
        print(f"[Export Debug] Start for patient={patient_id}, view={view}")

        data = get_patient_export_data(patient_id)

        template = env.get_template(_DEFAULT_TEMPLATE_NAME)
        html = template.render(patient=data["patient"], forms=data["forms"])

        pdf_path = os.path.join(EXPORT_DIR, f"{export_id}.pdf")
        pdfkit.from_string(html, pdf_path, options=WKHTML_OPTS, configuration=_PDFKIT_CFG)

        _JOBS[export_id]["status"] = "ready"
        _JOBS[export_id]["path"] = pdf_path
        print(f"[Export Debug] Ready at {pdf_path}")

    except Exception as e:
        print(f"[Export Error] {e}")
        _JOBS[export_id]["status"] = "error"
        _JOBS[export_id]["path"] = None

    return export_id


def get_job_state(export_id: str) -> Optional[str]:
    job = _JOBS.get(export_id)
    return job.get("status") if job else None


def get_job_file_path(export_id: str) -> Optional[str]:
    job = _JOBS.get(export_id)
    if not job or job.get("status") != "ready":
        return None
    return job.get("path")
