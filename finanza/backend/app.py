import os
from functools import wraps
from flask import Flask, request, jsonify, Blueprint
from flask_cors import CORS
from dotenv import load_dotenv

import firebase_admin
from firebase_admin import credentials, auth
from google.cloud import firestore
from google.oauth2 import service_account  # <-- NUEVO

# --- Cargar .env ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

# --- Inicializar Firebase Admin ---
raw = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "./key/service-account.json").strip().strip('"').strip("'")
cred_path = os.path.abspath(raw if os.path.isabs(raw) else os.path.join(BASE_DIR, raw))
cred_path = os.path.normpath(cred_path)

if not os.path.exists(cred_path):
    fallback = os.path.join(BASE_DIR, "key", "service-account.json")
    if os.path.exists(fallback):
        print(f"[WARN] GOOGLE_APPLICATION_CREDENTIALS inválido: {cred_path} -> usando {fallback}")
        cred_path = fallback
    else:
        raise FileNotFoundError(f"No existe la clave de servicio en: {cred_path}")

# 1) Firebase Admin
cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred)

# 2) Firestore con credenciales explícitas + project
creds_sa = service_account.Credentials.from_service_account_file(cred_path)
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = cred_path  # fuerza ABSOLUTA (independiente del CWD)
db = firestore.Client(credentials=creds_sa, project=creds_sa.project_id)

# --- Flask + CORS ---
app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {"origins": ["http://localhost", "http://localhost:8100", "capacitor://localhost"]}
})

# --- Auth helper ---
def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        authz = request.headers.get("Authorization", "")
        if not authz.startswith("Bearer "):
            return jsonify({"error": "Unauthorized"}), 401
        token = authz.split(" ", 1)[1]
        try:
            decoded = auth.verify_id_token(token)
        except Exception:
            return jsonify({"error": "Invalid token"}), 401
        request.uid = decoded["uid"]
        return fn(*args, **kwargs)
    return wrapper

# --- Rutas ---
api = Blueprint("api", __name__, url_prefix="/api/v1")




@api.get("/health")
def health():
    return {"ok": True}




@api.get("/users/me")
@require_auth
def get_me():
    ref = db.collection("users").document(request.uid).collection("profile").document("profile")
    snap = ref.get()
    data = snap.to_dict() or {}
    if not data:
        try:
            email = auth.get_user(request.uid).email or ""
        except Exception:
            email = ""
        data = {"nombre": "", "email": email, "tipoUsuario": "persona", "moneda": "CLP"}
        ref.set(data, merge=True)
    return data, 200



@api.patch("/users/me")
@require_auth
def patch_me():
    body = request.get_json() or {}
    allowed = {k: v for k, v in body.items() if k in {"nombre","email","tipoUsuario","moneda"}}
    if not allowed:
        return {"error": "Nada para actualizar"}, 400
    db.collection("users").document(request.uid).collection("profile").document("profile").set(allowed, merge=True)
    return {"ok": True}



@api.get("/config")
@require_auth
def get_config():
    ref = db.collection("users").document(request.uid).collection("config").document("config")
    return (ref.get().to_dict() or {"filtrosPorDefecto": {}}), 200



@api.put("/config")
@require_auth
def put_config():
    body = request.get_json() or {}
    cfg = {"filtrosPorDefecto": body.get("filtrosPorDefecto", {})}
    db.collection("users").document(request.uid).collection("config").document("config").set(cfg, merge=True)
    return {"ok": True}

app.register_blueprint(api)

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8080"))
    app.run(host="0.0.0.0", port=port, debug=True)
