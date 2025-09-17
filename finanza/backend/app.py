import os
from functools import wraps
from flask import Flask, request, jsonify, Blueprint
from flask_cors import CORS
from dotenv import load_dotenv

import firebase_admin
from firebase_admin import credentials, auth, storage
from google.cloud import firestore
from google.oauth2 import service_account  # <-- NUEVO
import uuid

# --- Cargar .env --- si existe
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
creds_sa = service_account.Credentials.from_service_account_file(cred_path)

firebase_admin.initialize_app(cred, {
    "storageBucket": f"{creds_sa.project_id}.appspot.com"
})

# 2) Firestore con credenciales explícitas + project
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
        except Exception as e:
            print("Error verificando token:", e)
            return jsonify({"error": "Invalid token"}), 401
        request.uid = decoded["uid"]
        return fn(*args, **kwargs)
    return wrapper


# --- Rutas ---
api = Blueprint("api", __name__, url_prefix="/api/v1")




@api.get("/health")
def health():
    return {"ok": True}



#Crea el perfil del usuario
@api.post("/users/me")
@require_auth
def create_user_profile():
    body = request.get_json() or {}
    # Campos permitidos
    allowed = {k: v for k, v in body.items() if k in {"name", "lastName", "email", "photoURL"}}

    # Perfil base
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


#Obtiene el perfil del usuario
@api.get("/users/me")
@require_auth
def get_me():
    # Documento raíz del usuario
    ref = db.collection("users").document(request.uid)
    snap = ref.get()

    if not snap.exists:
        # Si no existe, inicializamos con email y valores por defecto
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


#Actualiza el perfil del usuario
@api.patch("/users/me")
@require_auth
def patch_me():
    body = request.get_json() or {}
    
    # Permitimos actualizar solo estos campos
    allowed = {
        k: v for k, v in body.items()
        if k in {"name", "lastName", "email", "photoURL"}
    }

    if not allowed:
        return {"error": "Nada para actualizar"}, 400

    # Guardar en el documento raíz
    db.collection("users").document(request.uid).set(allowed, merge=True)

    return {"ok": True}


# Subir foto de perfil
@api.post("/users/me/photoURL")
@require_auth
def upload_photo():
    if "photoURL" not in request.files:
        return jsonify({"error": "No se envió archivo"}), 400

    file = request.files["photoURL"]

    # Solo permitimos imágenes
    if not file.mimetype.startswith("image/"):
        return jsonify({"error": "Archivo inválido, debe ser imagen"}), 400

    # Nombre único en carpeta avatars/
    filename = f"avatars/{request.uid}_{uuid.uuid4().hex}.jpg"

    # Subir a Firebase Storage
    bucket = storage.bucket()
    blob = bucket.blob(filename)
    blob.upload_from_file(file, content_type=file.mimetype)

    # Hacemos pública la URL (o puedes usar signed_url si prefieres temporal)
    blob.make_public()
    photo_url = blob.public_url

    # Actualizamos Firestore
    db.collection("users").document(request.uid).set(
        {"photoURL": photo_url, "updatedAt": firestore.SERVER_TIMESTAMP},
        merge=True
    )

    return {"photoURL": photo_url}, 200

app.register_blueprint(api)

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8080"))
    app.run(host="0.0.0.0", port=port, debug=True)
