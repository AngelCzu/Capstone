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
            # IMPORTANTE: check_revoked=True hace que verify_id_token falle si se revocó el refresh token
            decoded = auth.verify_id_token(token, check_revoked=True)
        except auth.InvalidIdTokenError as e:
            print("Invalid token:", e)
            return jsonify({"error": "Invalid token"}), 401
        except auth.RevokedIdTokenError as e:   # token fue revocado
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

# Revocar refresh tokens del usuario actual
import time
@api.post("/users/me/revoke")
@require_auth
def revoke_user_tokens():
    
    try:
        
        auth.revoke_refresh_tokens(request.uid)
        # Opcional: obtener el ts de revocación (segundos)
        user_record = auth.get_user(request.uid)
        revoked_at = int(time.time())  # referencia del momento de revocación

        return {"ok": True, "revokedAt": revoked_at}, 200
    except Exception as e:

        return {"error": str(e)}, 500


@api.get("/health")
def health():
    return {"ok": True}


#=============================================PERFIL DE USUARIO=============================================


#=============================================#
#=========Crea el perfil del usuario==========#
#=============================================#
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



#==============================================#
#========Obtiene el perfil del usuario=========#
#==============================================#
@api.get("/users/me")
@require_auth
def get_me():
    ref = db.collection("users").document(request.uid)
    snap = ref.get()

    # Email desde Firebase Auth
    try:
        user_record = auth.get_user(request.uid)
        email_auth = user_record.email or ""
    except Exception:
        email_auth = ""

    if not snap.exists:
        # Si no existe el perfil, lo creamos
        data = {
            "name": "",
            "lastName": "",
            "email": email_auth,
            "photoURL": "",
            "premium": False
        }
        ref.set(data)
        return data, 200

    data = snap.to_dict()

    # ⚡ Sincronizar email si difiere
    if data.get("email") != email_auth:
        data["email"] = email_auth
        ref.set({"email": email_auth}, merge=True)

    return data, 200



#==============================================#
#=======Actualiza el perfil del usuario========#
#==============================================#
@api.patch("/users/me")
@require_auth
def patch_me():
    body = request.get_json() or {}

    # Solo permitimos actualizar estos campos desde el frontend
    allowed = {
        k: v for k, v in body.items()
        if k in {"name", "lastName", "photoURL"}
    }

    #  Email siempre desde Firebase Authentication
    try:
        user_record = auth.get_user(request.uid)
        allowed["email"] = user_record.email or ""
    except Exception as e:
        print("Error obteniendo email desde Firebase Auth:", e)

    if not allowed:
        return {"error": "Nada para actualizar"}, 400

    db.collection("users").document(request.uid).set(allowed, merge=True)
    return {"ok": True}




#==============================================#
#========== Eliminar cuenta de usuario =========#
#==============================================#
@api.delete("/users/me")
@require_auth
def delete_me():
    try:
        uid = request.uid

        # 1) Eliminar perfil en Firestore
        db.collection("users").document(uid).delete()

        # Si tienes colecciones relacionadas (movements, stats, etc.),
        # deberías borrarlas aquí también con un batch o recursivamente.

        # 2) Eliminar usuario en Firebase Auth
        auth.delete_user(uid)

        return {"ok": True, "message": "Cuenta eliminada correctamente"}, 200

    except Exception as e:
        print("[ERROR] Eliminando cuenta:", e)
        return {"error": str(e)}, 500





#=============================================#
#======Subir foto de perfil del usuario=======# 
#=============================================#
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




#============================================= CAMBIO CORREO =============================================#
import random, time, smtplib, ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

#==============================================#
#======PLANTILLA CAMBIO CORREO (PIN)=======#
#==============================================#

PIN_TTL = int(os.getenv("EMAIL_PIN_TTL_SECONDS", "300"))
PIN_MAX_ATTEMPTS = int(os.getenv("EMAIL_PIN_MAX_ATTEMPTS", "5"))

def send_pin_email(to_email: str, pin: str):
    """Envía el PIN por SMTP (Gmail con TLS o SSL)."""
    host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    pwd  = os.getenv("SMTP_PASS")
    from_hdr = os.getenv("SMTP_FROM", user)

    if not (host and port and user and pwd):
        print(f"[WARN] SMTP no configurado. PIN={pin} → {to_email}")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Código de verificación de correo (Finanza)"
    msg["From"] = from_hdr
    msg["To"] = to_email

    text = f"""Hola,

Hemos recibido una solicitud para verificar que eres el dueño de la cuenta en FinanzaApp.

Tu código de verificación es: {pin}

⏳ Este código expira en {PIN_TTL//60} minutos.

Si no realizaste esta solicitud, ignora este correo y tu cuenta permanecerá segura.

Gracias por confiar en nosotros.

Saludos cordiales,  
Equipo Finanza
"""

    html = f"""
<div style="font-family: Arial, Helvetica, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e5e5; border-radius: 8px; background: #fafafa;">
  <h2 style="color: #2c3e50; text-align: center; font-weight: 600;">Verificación de tu cuenta</h2>
  
  <p>Hola,</p>
  <p>Hemos recibido una solicitud para verificar que eres el dueño de la cuenta en  <strong>FinanzaApp</strong>. 
  Para continuar, utiliza el siguiente código de verificación:</p>
  
  <div style="text-align: center; margin: 25px 0;">
    <span style="font-size: 28px; font-weight: bold; letter-spacing: 8px; color: #2c3e50; padding: 12px 24px; background: #ffffff; border: 1px solid #ddd; border-radius: 6px; display: inline-block;">
      {pin}
    </span>
  </div>
  
  <p style="font-size: 14px; color: #555;">
    Este código expira en <strong>{PIN_TTL//60} minutos</strong>.  
    Si no solicitaste esta verificación, no te preocupes, tu información permanecerá protegida.
  </p>
  
  <p style="font-size: 14px; color: #555;">
    Te recordamos que Finanza nunca solicitará tu contraseña por correo electrónico.  
    Mantén tus credenciales seguras y no las compartas con nadie.
  </p>
  
  <hr style="margin: 25px 0; border: none; border-top: 1px solid #eee;">
  <p style="text-align: center; font-size: 13px; color: #999;">
    Este es un mensaje automático, por favor no respondas a este correo.  
    — Equipo <strong>Finanza</strong>
  </p>
</div>
"""


    msg.attach(MIMEText(text, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

    ctx = ssl.create_default_context()

    try:
        if port == 465:
            # SSL directo
            with smtplib.SMTP_SSL(host, port, context=ctx) as server:
                server.login(user, pwd)
                server.sendmail(from_hdr, [to_email], msg.as_string())
        else:
            # TLS (587)
            with smtplib.SMTP(host, port) as server:
                server.ehlo()
                server.starttls(context=ctx)
                server.ehlo()
                server.login(user, pwd)
                server.sendmail(from_hdr, [to_email], msg.as_string())


    except Exception as e:
        print(f"[ERROR] enviando correo PIN: {e}")
        raise



#==================================================#
#====== Genera un PIN numérico de 6 dígitos =======#
#==================================================#
def _new_pin(not_equal_to: str | None = None) -> str:
    while True:
        pin = f"{random.randint(0, 999999):06d}"
        if not_equal_to and pin == not_equal_to:
            continue
        return pin

#===============================================#
#======Solicitar cambio de email del usuario====#
#===============================================#
@api.post("/users/me/email-change/request")
@require_auth
def request_email_change():
    body = request.get_json() or {}
    new_email = (body.get("newEmail") or "").strip().lower()
    if not new_email:
        return {"error": "Falta newEmail"}, 400

    # Traer último PIN para que no se repita
    ref = db.collection("pendingEmailChange").document(request.uid)
    prev = ref.get().to_dict() if ref.get().exists else {}
    last_pin = prev.get("pin")

    pin = _new_pin(not_equal_to=last_pin)
    now = int(time.time())
    ref.set({
        "uid": request.uid,
        "newEmail": new_email,
        "pin": pin,
        "expiresAt": now + PIN_TTL,
        "attempts": 0,
        "maxAttempts": PIN_MAX_ATTEMPTS,
        "createdAt": now,
        "status": "pending"
    })
    try:
        send_pin_email(new_email, pin)
        print(f'Se envio el correo a {new_email}')
    except Exception as e:
        print("[ERROR] enviando correo PIN:", e)
        return {"error": "No se pudo enviar el correo de verificación"}, 500

    return {"ok": True, "ttl": PIN_TTL}, 200




#===============================================#
#======Confirma PIN enviado email=======#
#===============================================#
@api.post("/users/me/email-change/confirm")
@require_auth
def confirm_email_change():
    
    emmmail = db.collection("users").document(request.uid)
    re = emmmail.get()
    o = re.to_dict()
    last_email = o.get("email") 


    body = request.get_json() or {}
    pin = (body.get("pin") or "").strip()
    if not pin or len(pin) != 6 or not pin.isdigit():
        return {"error": "PIN inválido"}, 400
    

    ref = db.collection("pendingEmailChange").document(request.uid)
    snap = ref.get()
    if not snap.exists:
        return {"error": "No hay operación pendiente"}, 400

    data = snap.to_dict()
    if data.get("status") != "pending":
        ref.delete()
        return {"error": "Operación inválida"}, 400

    now = int(time.time())
    if now > int(data.get("expiresAt", 0)):
        ref.delete()
        return {"error": "PIN expirado"}, 400

    attempts = int(data.get("attempts", 0))
    max_attempts = int(data.get("maxAttempts", PIN_MAX_ATTEMPTS))
    if attempts >= max_attempts:
        ref.delete()
        return {"error": "Demasiados intentos"}, 400

    if pin != data.get("pin"):
        ref.set({"attempts": attempts + 1}, merge=True)
        return {"error": "PIN incorrecto"}, 400

    # ✅ PIN correcto → actualizar AUTH & Firestore
    new_email = data.get("newEmail")
    try:
        
        if new_email != last_email:
            # Firestore perfil
            auth.update_user(request.uid, email=new_email)  # Admin SDK
            db.collection("users").document(request.uid).set({"email": new_email}, merge=True)
        else:
            auth.delete_user(request.uid)# Admin SDK
            db.collection("users").document(request.uid).delete()
            print("eliminado exitosamente")
          
    except Exception as e:
        print("[ERROR] update_user:", e)
        return {"error": "No se pudo realizar cambios en Auth"}, 500

    
    # Terminar operación y revocar tokens para forzar re-login
    ref.delete()
    try:
        auth.revoke_refresh_tokens(request.uid)
    except Exception as e:
        print("[WARN] revoke_refresh_tokens:", e)

    return {"ok": True, "newEmail": new_email}, 200



#===============================================#
#======Cancela el cambio de email del usuario====#
#===============================================#
@api.post("/users/me/email-change/cancel")
@require_auth
def cancel_email_change():
    ref = db.collection("pendingEmailChange").document(request.uid)
    ref.delete()
    return {"ok": True}, 200



app.register_blueprint(api)

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8080"))
    app.run(host="0.0.0.0", port=port, debug=True)




