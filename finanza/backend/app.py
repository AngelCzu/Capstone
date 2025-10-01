import os
import time
import uuid
from functools import wraps
from flask import Flask, request, jsonify, Blueprint
from flask_cors import CORS
from dotenv import load_dotenv

import firebase_admin
from firebase_admin import credentials, auth, storage
from google.cloud import firestore
from google.oauth2 import service_account

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

cred = credentials.Certificate(cred_path)
creds_sa = service_account.Credentials.from_service_account_file(cred_path)

firebase_admin.initialize_app(cred, {
    "storageBucket": f"{creds_sa.project_id}.appspot.com"
})

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = cred_path
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
        print("Authorization recibido:", authz)
        if not authz.startswith("Bearer "):
            return jsonify({"error": "Unauthorized"}), 401
        token = authz.split(" ", 1)[1]
        try:
            decoded = auth.verify_id_token(token, check_revoked=True)
        except auth.InvalidIdTokenError as e:
            print("Invalid token:", e)
            return jsonify({"error": "Invalid token"}), 401
        except auth.RevokedIdTokenError as e:
            print("Token revocado:", e)
            return jsonify({"error": "Token revoked"}), 401
        except Exception as e:
            print("Error verificando token:", e)
            return jsonify({"error": "Invalid token"}), 401
        request.uid = decoded["uid"]
        return fn(*args, **kwargs)
    return wrapper

# --- Rutas ---
api = Blueprint("api", __name__, url_prefix="/api/v1")

# ========== Salud ==========
@api.get("/health")
def health():
    return {"ok": True}

# ========== Revocar tokens ==========
@api.post("/users/me/revoke")
@require_auth
def revoke_user_tokens():
    try:
        auth.revoke_refresh_tokens(request.uid)
        revoked_at = int(time.time())
        print(f"Revoked refresh tokens for uid={request.uid} at {revoked_at}")
        return {"ok": True, "revokedAt": revoked_at}, 200
    except Exception as e:
        print("Error revoking tokens:", e)
        return {"error": str(e)}, 500

# ========== Perfil ==========
@api.post("/users/me")
@require_auth
def create_user_profile():
    body = request.get_json() or {}
    allowed = {k: v for k, v in body.items() if k in {"name", "lastName", "email", "photoURL"}}

    data = {
        "uid": request.uid,
        "name": allowed.get("name", ""),
        "lastName": allowed.get("lastName", ""),
        "email": allowed.get("email", ""),
        "photoURL": allowed.get("photoURL", ""),
        "premium": False,
        "createdAt": firestore.SERVER_TIMESTAMP,
        "updatedAt": firestore.SERVER_TIMESTAMP
    }

    ref = db.collection("users").document(request.uid)
    ref.set(data, merge=True)
    return {"ok": True}, 201

@api.get("/users/me")
@require_auth
def get_me():
    ref = db.collection("users").document(request.uid)
    snap = ref.get()

    if not snap.exists:
        try:
            user_record = auth.get_user(request.uid)
            email = user_record.email or ""
        except Exception:
            email = ""

        data = {
            "name": "",
            "lastName": "",
            "email": email,
            "photoURL": "",
            "premium": False
        }
        ref.set(data)
        return data, 200

    return snap.to_dict(), 200

@api.patch("/users/me")
@require_auth
def patch_me():
    body = request.get_json() or {}
    allowed = {k: v for k, v in body.items() if k in {"name", "lastName", "email", "photoURL"}}

    if not allowed:
        return {"error": "Nada para actualizar"}, 400

    db.collection("users").document(request.uid).set(allowed, merge=True)
    return {"ok": True}

@api.post("/users/me/photoURL")
@require_auth
def upload_photo():
    if "photoURL" not in request.files:
        return jsonify({"error": "No se envió archivo"}), 400

    file = request.files["photoURL"]

    if not file.mimetype.startswith("image/"):
        return jsonify({"error": "Archivo inválido, debe ser imagen"}), 400

    filename = f"avatars/{request.uid}_{uuid.uuid4().hex}.jpg"

    bucket = storage.bucket()
    blob = bucket.blob(filename)
    blob.upload_from_file(file, content_type=file.mimetype)

    blob.make_public()
    photo_url = blob.public_url

    db.collection("users").document(request.uid).set(
        {"photoURL": photo_url, "updatedAt": firestore.SERVER_TIMESTAMP},
        merge=True
    )

    return {"photoURL": photo_url}, 200

# ========== Subcolecciones ==========
@api.post("/users/me/ingresos")
@require_auth
def add_ingreso():
    body = request.get_json() or {}
    data = {
        "nombre": body.get("nombre"),
        "monto": body.get("monto"),
        "createdAt": firestore.SERVER_TIMESTAMP
    }
    ref = db.collection("users").document(request.uid).collection("ingresos").document()
    ref.set(data)
    return {"ok": True, "id": ref.id}, 201

@api.post("/users/me/gastos")
@require_auth
def add_gasto():
    body = request.get_json() or {}
    data = {
        "nombre": body.get("nombre"),
        "monto": body.get("monto"),
        "createdAt": firestore.SERVER_TIMESTAMP
    }
    ref = db.collection("users").document(request.uid).collection("gastos").document()
    ref.set(data)
    return {"ok": True, "id": ref.id}, 201

@api.post("/users/me/deudas")
@require_auth
def add_deuda():
    body = request.get_json() or {}
    data = {
        "nombre": body.get("nombre"),
        "monto": body.get("monto"),
        "cuotas": body.get("cuotas"),
        "compartido": body.get("compartido", False),
        "participantes": body.get("participantes", []),
        "createdAt": firestore.SERVER_TIMESTAMP
    }
    ref = db.collection("users").document(request.uid).collection("deudas").document()
    ref.set(data)
    return {"ok": True, "id": ref.id}, 201

@api.post("/users/me/objetivos")
@require_auth
def add_objetivo():
    body = request.get_json() or {}
    data = {
        "nombre": body.get("nombre"),
        "monto": body.get("monto"),
        "tiempo": body.get("tiempo"),
        "compartido": body.get("compartido", False),
        "participantes": body.get("participantes", []),
        "createdAt": firestore.SERVER_TIMESTAMP
    }
    ref = db.collection("users").document(request.uid).collection("objetivos").document()
    ref.set(data)
    return {"ok": True, "id": ref.id}, 201

# --- Registrar blueprint ---
app.register_blueprint(api)

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8080"))
    app.run(host="0.0.0.0", port=port, debug=True)
