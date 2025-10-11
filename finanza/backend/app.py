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
        # Opcional: obtener el ts de revocación (segundos)
        user_record = auth.get_user(request.uid)
        revoked_at = int(time.time())  # referencia del momento de revocación

        return {"ok": True, "revokedAt": revoked_at}, 200
    except Exception as e:

        return {"error": str(e)}, 500




#=============================================PERFIL DE USUARIO=============================================


#=============================================#
#=========Crea el perfil del usuario==========#
#=============================================#
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
        "updatedAt": firestore.SERVER_TIMESTAMP,

        "settings":{
            "recordatoriosGastos": True,
            "recordatoriosPagos": True,
        },
        "fcmTokens":[],

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
            "premium": False,


        }
        ref.set(data)
        return data, 200

    data = snap.to_dict()

    #  Sincronizar email si difiere
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

    updates = {}

    # Solo permitimos actualizar estos campos desde el frontend (Campos permitidos)

    for field in ["name", "lastName", "photoURL"]:
        if field in body:
            updates[field] = body[field]

    #  Email siempre desde Firebase Authentication
    try:
        user_record = auth.get_user(request.uid)
        updates["email"] = user_record.email or ""
    except Exception as e:
        print("Error obteniendo email desde Firebase Auth:", e)

    # settings parciales (Notificaciones)
    if "settings" in body and isinstance(body["settings"], dict):
        updates["settings"] = body["settings"]

    if not updates:
        return {"error": "Nada para actualizar"}, 400

    db.collection("users").document(request.uid).set(updates, merge=True)
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


#============================================= NOTIFICACIONES =============================================#

#==============================================#
#=======Registrar token de notificación========#
#==============================================#
@api.post("/users/me/fcm-token")
@require_auth
def register_fcm_token():
    body = request.get_json() or {}
    token = body.get("token")

    if not token:
        return {"error": "Falta token"}, 400

    db.collection("users").document(request.uid).set({
        "fcmTokens": firestore.ArrayUnion([token])
    }, merge=True)

    return {"ok": True}


#==============================================#
#====Eliminar token de notificación============#
#==============================================#
@api.delete("/users/me/fcm-token")
@require_auth
def unregister_fcm_token():
    body = request.get_json() or {}
    token = body.get("token")

    if not token:
        return {"error": "Falta token"}, 400

    db.collection("users").document(request.uid).set({
        "fcmTokens": firestore.ArrayRemove([token])
    }, merge=True)

    return {"ok": True}


#==============================================#
#===========Enviar notificación test===========#
#==============================================#
from firebase_admin import messaging

@api.post("/users/me/push-test")
@require_auth
def push_test():
    doc = db.collection("users").document(request.uid).get()
    data = doc.to_dict() or {}
    tokens = data.get("fcmTokens", [])

    if not tokens:
        return {"error": "Usuario sin tokens registrados"}, 400

    message = messaging.MulticastMessage(
        tokens=tokens,
        notification=messaging.Notification(
            title="Finanza",
            body="¡Notificación de prueba enviada! ✅"
        ),
        data={"kind": "test"}
    )

    resp = messaging.send_each_for_multicast(message)
    return {
        "ok": True,
        "success": resp.success_count,
        "failure": resp.failure_count
    }



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

Este código expira en {PIN_TTL//60} minutos.

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
#======Solicitar confirmacion del usuario====#
#===============================================#
from google.cloud import firestore
from datetime import datetime, timedelta, timezone
@api.post("/users/me/pin/request")
@require_auth
def request_pin():
    body = request.get_json() or {}
    action = body.get("action")   # ej: "email-change", "delete-account"
    target = body.get("target")   # ej: nuevo email o simplemente el actual

    expires_at = datetime.now(timezone.utc) + timedelta(seconds=PIN_TTL)
    if not action:
        return {"error": "Falta action"}, 400

    # Email destino → si no es cambio de correo, usamos el actual
    if action == "email-change":
        if not target:
            return {"error": "Falta newEmail"}, 400
        email = target
    else:
        # acciones sensibles → mandar PIN al correo actual
        user_record = auth.get_user(request.uid)
        email = user_record.email

    if not email:
        return {"error": "Usuario sin email"}, 400

    # Generar y guardar PIN
    ref = db.collection("pendingPins").document(request.uid)
    prev = ref.get().to_dict() if ref.get().exists else {}
    last_pin = prev.get("pin")
    pin = _new_pin(not_equal_to=last_pin)


    ref.set({
        "uid": request.uid,
        "action": action,
        "target": target,
        "pin": pin,
        "expiresAt": firestore.SERVER_TIMESTAMP if False else expires_at,
        "attempts": 0,
        "maxAttempts": PIN_MAX_ATTEMPTS,
        "createdAt": datetime.now(timezone.utc),
        "status": "pending"
    })

    try:
        send_pin_email(email, pin)
    except Exception as e:
        return {"error": "No se pudo enviar el correo"}, 500

    return {"ok": True, "ttl": PIN_TTL}, 200





#===============================================#
#======Confirma PIN enviado email=======#
#===============================================#
@api.post("/users/me/pin/confirm")
@require_auth
def confirm_pin():
    body = request.get_json() or {}
    pin = (body.get("pin") or "").strip()

    if not pin or len(pin) != 6 or not pin.isdigit():
        return {"error": "PIN inválido"}, 400

    ref = db.collection("pendingPins").document(request.uid)
    snap = ref.get()
    if not snap.exists:
        return {"error": "No hay operación pendiente"}, 400

    data = snap.to_dict()

    # Validaciones de expiración
    now = datetime.now(timezone.utc)
    if data.get("status") != "pending" or now > data.get("expiresAt"):
        ref.delete()
        return {"error": "PIN expirado o inválido"}, 400

    # Validaciones de intentos
    attempts = int(data.get("attempts", 0))
    max_attempts = int(data.get("maxAttempts", PIN_MAX_ATTEMPTS))

    if pin != data.get("pin"):
        attempts += 1
        if attempts >= max_attempts:
            ref.delete()
            return {"error": "Demasiados intentos"}, 400
        else:
            ref.set({"attempts": attempts}, merge=True)
            return {"error": "PIN incorrecto"}, 400

    # ✅ PIN correcto → ejecutar acción
    action = data.get("action")
    target = data.get("target")

    try:
        if action == "email-change":
            auth.update_user(request.uid, email=target)
            db.collection("users").document(request.uid).set({"email": target}, merge=True)
        elif action == "delete-account":
            db.collection("users").document(request.uid).delete()
            auth.delete_user(request.uid)
        else:
            return {"error": "Acción no soportada"}, 400
    except Exception as e:
        return {"error": f"No se pudo completar la acción: {e}"}, 500
    finally:
        ref.delete()
        try:
            auth.revoke_refresh_tokens(request.uid)
        except Exception as e:
            print("[WARN] revoke_refresh_tokens:", e)

    return {"ok": True, "action": action}, 200




#===============================================#
#======Cancela el cambio de email del usuario====#
#===============================================#
@api.post("/users/me/pin/cancel")
@require_auth
def cancel_pin():
    body = request.get_json() or {}
    action = body.get("action")
    ref = db.collection("pendingPins").document(request.uid)
    snap = ref.get()
    if snap.exists and (not action or snap.to_dict().get("action") == action):
        ref.delete()
    return {"ok": True}, 200


#========================================= AGREGAR MOVIMIENTOS =========================================#



# Helper para actualizar resumen
def actualizar_resumen(uid, año, mes, tipo, monto):
    resumen_ref = (
        db.collection("users")
        .document(uid)
        .collection("resumenes")
        .document(f"{año}-{mes:02d}")
    )
    resumen = resumen_ref.get().to_dict() or {"ingresos": 0, "gastos": 0, "deudas": 0, "ahorro": 0}

    if tipo == "ingreso":
        resumen["ingresos"] += monto
    elif tipo == "gasto":
        resumen["gastos"] += monto
    elif tipo == "deuda":
        resumen["deudas"] += monto

    resumen["ahorro"] = resumen["ingresos"] - resumen["gastos"] - resumen["deudas"]
    resumen_ref.set(resumen, merge=True)

# Helper para calcular semestre
def obtener_semestre(mes):
    return 1 if mes <= 6 else 2

# ======================================
# 1️⃣ AGREGAR INGRESO
# ======================================
@api.post("/users/me/ingresos")
@require_auth
def add_ingreso():
    body = request.get_json() or {}
    now = datetime.utcnow()
    año, mes, semestre = now.year, now.month, obtener_semestre(now.month)

    data = {
        "nombre": body.get("nombre"),
        "monto": float(body.get("monto", 0)),
        "fecha": now.isoformat(),
        "año": año,
        "mes": mes,
        "semestre": semestre,
        "createdAt": firestore.SERVER_TIMESTAMP,
    }

    mov_ref = (
        db.collection("users")
        .document(request.uid)
        .collection("movimientos")
        .document()
    )
    mov_ref.set(data)

    actualizar_resumen(request.uid, año, mes, "ingreso", data["monto"])

    return {"ok": True, "id": mov_ref.id}, 201


# ======================================
# 2️⃣ AGREGAR GASTO
# ======================================
@api.post("/users/me/gastos")
@require_auth
def add_gasto():
    body = request.get_json() or {}
    now = datetime.utcnow()
    año, mes, semestre = now.year, now.month, obtener_semestre(now.month)

    data = {
        "nombre": body.get("nombre"),
        "monto": float(body.get("monto", 0)),        # Valor en CLP ya calculado
        "montoUF": body.get("montoUF") or None,              # Solo si el gasto fue en UF
        "valorUF": body.get("valorUF") or None,              # Valor de la UF usada
        "moneda": body.get("moneda", "CLP"),         # "CLP" o "UF"
        "categoria": body.get("categoria"),
        "frecuencia": body.get("frecuencia", "unica"),
        "compartido": body.get("compartido", False),
        "participantes": body.get("participantes", []),
        "fecha": now.isoformat(),
        "año": año,
        "mes": mes,
        "semestre": semestre,
        "createdAt": firestore.SERVER_TIMESTAMP,
    }

    mov_ref = (
        db.collection("users")
        .document(request.uid)
        .collection("movimientos")
        .document()
    )
    mov_ref.set(data)

    actualizar_resumen(request.uid, año, mes, "gasto", data["monto"])

    return {"ok": True, "id": mov_ref.id}, 201


# ======================================
# ========== AGREGAR DEUDA =============
# ======================================

@api.post("/users/me/deudas")
@require_auth
def add_deuda():
    body = request.get_json() or {}
    now = datetime.utcnow()
    año, mes, semestre = now.year, now.month, obtener_semestre(now.month)

    data = {
        "nombre": body.get("nombre"),
        "monto": float(body.get("monto", 0)),         # Valor en CLP (calculado en el front)
        "montoUF": body.get("montoUF") or None,               # Solo si fue en UF
        "valorUF": body.get("valorUF") or None,               # Valor de la UF usada
        "moneda": body.get("moneda", "CLP"),          # "CLP" o "UF"
        "cuotas": body.get("cuotas"),                 # Número de cuotas
        "fechaPago": body.get("fechaPago"),           # Fecha de pago elegida
        "compartido": body.get("compartido", False),
        "participantes": body.get("participantes", []),
        "fecha": now.isoformat(),
        "año": año,
        "mes": mes,
        "semestre": semestre,
        "createdAt": firestore.SERVER_TIMESTAMP,
    }

    mov_ref = (
        db.collection("users")
        .document(request.uid)
        .collection("movimientos")
        .document()
    )
    mov_ref.set(data)

    actualizar_resumen(request.uid, año, mes, "deuda", data["monto"])

    return {"ok": True, "id": mov_ref.id}, 201


# ======================================
# 4️⃣ AGREGAR OBJETIVO
# ======================================
@api.post("/users/me/objetivos")
@require_auth
def add_objetivo():
    body = request.get_json() or {}
    now = datetime.utcnow()
    año, mes, semestre = now.year, now.month, obtener_semestre(now.month)

    data = {
        "nombre": body.get("nombre"),
        "monto": float(body.get("monto", 0)),          # Valor en CLP calculado por el front
        "montoUF": body.get("montoUF") or None,                # Solo si se ingresó en UF
        "valorUF": body.get("valorUF") or None,                # Valor de la UF usada
        "moneda": body.get("moneda", "CLP"),           # "CLP" o "UF"
        "categoria": body.get("categoria"),
        "tiempo": body.get("tiempo") or None,                  # Plazo del objetivo
        "compartido": body.get("compartido", False),
        "participantes": body.get("participantes", []),
        "fecha": now.isoformat(),
        "año": año,
        "mes": mes,
        "semestre": semestre,
        "createdAt": firestore.SERVER_TIMESTAMP,
    }

    mov_ref = (
        db.collection("users")
        .document(request.uid)
        .collection("movimientos")
        .document()
    )
    mov_ref.set(data)

    return {"ok": True, "id": mov_ref.id}, 201






# --- Registrar blueprint ---
app.register_blueprint(api)

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8080"))
    app.run(host="0.0.0.0", port=port, debug=True)




