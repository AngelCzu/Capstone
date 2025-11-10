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

    uid = request.uid
    ref_user = db.collection("users").document(uid)
    doc = ref_user.get()

    # Si el usuario no existe, lo creamos y agregamos categorías
    if not doc.exists:
        data = {
            "uid": uid,
            "name": allowed.get("name", ""),
            "lastName": allowed.get("lastName", ""),
            "email": allowed.get("email", ""),
            "photoURL": allowed.get("photoURL", ""),
            "premium": False,
            "createdAt": firestore.SERVER_TIMESTAMP,
            "updatedAt": firestore.SERVER_TIMESTAMP,
            "settings": {
                "recordatoriosGastos": True,
                "recordatoriosPagos": True,
            },
            "fcmTokens": [],
        }
        ref_user.set(data, merge=True)

        # Categorías base de movimientos (usando paleta Ionic)
        categorias_mov = [
            {"tipo": "movimiento", "nombre": "Comida", "icono": "🍽️", "color": "#10dc60"},          # Success - verde
            {"tipo": "movimiento", "nombre": "Servicios", "icono": "💡", "color": "#ffd31a"},        # Warning-tint - amarillo cálido
            {"tipo": "movimiento", "nombre": "Transporte", "icono": "🚌", "color": "#3880ff"},       # Primary - azul puro
            {"tipo": "movimiento", "nombre": "Ocio / Personal", "icono": "🎮", "color": "#9b59b6"},  # Violeta fuerte (fuera de Ionic pero complementario)
            {"tipo": "movimiento", "nombre": "Salud / Educación", "icono": "🏥", "color": "#f04141"} # Danger - rojo
        ]


        # Categorías base de objetivos (usando paleta Ionic)
        categorias_obj = [
            {"tipo": "objetivo", "nombre": "Vacaciones / Verano", "icono": "😎", "color": "#ffce00"},        # Warning
            {"tipo": "objetivo", "nombre": "Estudio / Educación", "icono": "📘", "color": "#3171e0"},       # Primary-shade
            {"tipo": "objetivo", "nombre": "Transporte / Vehículo", "icono": "🚗", "color": "#ffd31a"},     # Warning-tint
            {"tipo": "objetivo", "nombre": "Hogar / Vivienda", "icono": "🏠", "color": "#28ba62"},          # Tertiary-shade
            {"tipo": "objetivo", "nombre": "Personal / Especial", "icono": "💍", "color": "#4854e0"},       # Secondary-shade
            {"tipo": "objetivo", "nombre": "Tecnología / Trabajo", "icono": "💻", "color": "#0ec254"},      # Success-shade
            {"tipo": "objetivo", "nombre": "Viaje / Experiencia", "icono": "🧳", "color": "#f25454"}        # Danger-tint
        ]



        batch = db.batch()
        col_ref = ref_user.collection("categorias")

        for cat in categorias_mov + categorias_obj:
            doc_ref = col_ref.document()
            batch.set(doc_ref, {
                **cat,
                "createdAt": firestore.SERVER_TIMESTAMP
            })

        batch.commit()

        return {"ok": True, "message": "Usuario y categorías creadas."}, 201

    # Si el usuario ya existía, solo actualizamos datos básicos
    else:
        ref_user.update({
            **allowed,
            "updatedAt": firestore.SERVER_TIMESTAMP
        })
        return {"ok": True, "message": "Usuario actualizado."}, 200




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
            user_ref = db.collection("users").document(request.uid)

            # Borrar todas las subcolecciones del usuario
            subcollections = user_ref.collections()
            for sub in subcollections:
                for doc in sub.stream():
                    doc.reference.delete()

            # Borrar el documento raíz del usuario
            user_ref.delete()

            # Eliminar el usuario de Firebase Auth
            auth.delete_user(request.uid)

        else:
            return {"error": "Acción no soportada"}, 400
    except Exception as e:
        return {"error": f"No se pudo completar la acción: {e}"}, 500
    finally:
        ref.delete()
       # try:
       #     auth.revoke_refresh_tokens(request.uid)
       # except Exception as e:
       #     print("[WARN] revoke_refresh_tokens:", e)

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









#===================================================================================================================================#
#===================================================== AGREGAR MOVIMIENTOS =========================================================#
#===================================================================================================================================#

#========= Agregar categorias =============
@api.post("/users/me/categorias")
@require_auth
def add_categoria():
    body = request.get_json() or {}

    nombre = body.get("nombre")
    tipo = body.get("tipo", "movimiento")
    color = body.get("color", "#e67e22")
    icono = body.get("icono", "📦")

    if not nombre:
        return {"error": "El campo 'nombre' es obligatorio"}, 400

    data = {
        "nombre": nombre,
        "tipo": tipo,
        "color": color,
        "icono": icono,
        "createdAt": firestore.SERVER_TIMESTAMP,
    }

    cat_ref = (
        db.collection("users")
        .document(request.uid)
        .collection("categorias")
        .document()
    )

    # Guardar la categoría en Firestore
    cat_ref.set(data)

    # Responder igual que tus otros endpoints (sin devolver el sentinel)
    return {"ok": True, "id": cat_ref.id}, 201




#=========== Obtener categorías ===============#
@api.get("/users/me/categorias")
@require_auth
def get_categorias():
    tipo = request.args.get("tipo")  # puede ser 'movimiento' o 'objetivo'
    ref = db.collection("users").document(request.uid).collection("categorias")

    if tipo:
        docs = ref.where("tipo", "==", tipo).stream()
    else:
        docs = ref.stream()

    categorias = []
    for d in docs:
        cat = d.to_dict()
        cat["id"] = d.id
        categorias.append(cat)

    return {"ok": True, "categorias": categorias}, 200

#=========== Actualizar categoría ===============#
@api.patch("/users/me/categorias/<cat_id>")
@require_auth
def update_categoria(cat_id):
    try:
        data = request.get_json()

        if not data:
            return {"ok": False, "error": "Datos vacíos"}, 400

        campos_permitidos = ["nombre", "icono", "color"]
        actualizacion = {k: v for k, v in data.items() if k in campos_permitidos}

        if not actualizacion:
            return {"ok": False, "error": "Nada que actualizar"}, 400

        ref = (
            db.collection("users")
            .document(request.uid)
            .collection("categorias")
            .document(cat_id)
        )

        doc = ref.get()
        if not doc.exists:
            return {"ok": False, "error": "Categoría no encontrada"}, 404

        ref.update(actualizacion)

        return {"ok": True, "mensaje": "Categoría actualizada correctamente"}, 200

    except Exception as e:
        print(f"❌ Error al actualizar categoría: {e}")
        return {"ok": False, "error": str(e)}, 500




#========ELIMINAR CATEGORÍAS========#
@api.delete("/users/me/categorias/<cat_id>")
@require_auth
def delete_categoria(cat_id):
    ref = db.collection("users").document(request.uid).collection("categorias").document(cat_id)
    ref.delete()
    return {"ok": True, "message": "Categoría eliminada"}, 200




#========AGREGAR MOVIMIENTOS==========#

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


#========= AGREGAR INGRESO ===========

@api.post("/users/me/ingresos")
@require_auth
def add_ingreso():
    body = request.get_json() or {}
    now = datetime.utcnow()
    año, mes, semestre = now.year, now.month, obtener_semestre(now.month)

    data = {
        "tipo": "ingreso",
        "origen": body.get("origen"),
        "monto": float(body.get("monto", 0)),
        "fecha": now.isoformat(),
        "año": año,
        "mes": mes,
        "semestre": semestre,
        "createdAt": firestore.SERVER_TIMESTAMP,
        "moneda": "CLP",
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


#=========== AGREGAR GASTO =============

@api.post("/users/me/gastos")
@require_auth
def add_gasto():
    body = request.get_json() or {}
    now = datetime.utcnow()
    año, mes, semestre = now.year, now.month, obtener_semestre(now.month)

    # Normalización del valor UF
    valorUF = None
    if body.get("moneda") == "UF":
        try:
            valorUF = round(float(body.get("valorUF", 0)), 2)
        except Exception:
            valorUF = None

    data = {
        "tipo": "gasto",
        "origen": body.get("origen"),
        "monto": round(float(body.get("monto", 0)), 0),        # Valor en CLP ya calculado
        "montoUF": body.get("montoUF") or None,              # Solo si el gasto fue en UF
        "valorUF":valorUF or None,              # Valor de la UF usada
        "moneda": body.get("moneda", "CLP"),         # "CLP" o "UF"
        "categoria": body.get("categoria"),
        "frecuencia": body.get("frecuencia", "unica"),
        "compartido": body.get("compartido", False),
        "modoDivision": body.get("modoDivision") or None,  # agregado
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



# ========== AGREGAR DEUDA =============
@api.post("/users/me/deudas")
@require_auth
def add_deuda():
    body = request.get_json() or {}
    now = datetime.utcnow()
    año, mes, semestre = now.year, now.month, obtener_semestre(now.month)

    # Normalización del valor UF
    valorUF = None
    if body.get("moneda") == "UF":
        try:
            valorUF = round(float(body.get("valorUF", 0)), 2)
        except Exception:
            valorUF = None

    data = {
        "tipo": "deuda",
        "origen": body.get("origen"),
        "monto": round(float(body.get("monto", 0)), 0),         # Valor en CLP (calculado en el front)
        "montoUF": body.get("montoUF") or None,               # Solo si fue en UF
        "valorUF": valorUF or None,               # Valor de la UF usada
        "moneda": body.get("moneda", "CLP"),          # "CLP" o "UF"
        "cuotas": body.get("cuotas"),                 # Número de cuotas
        "fechaPago": body.get("fechaPago"),           # Fecha de pago elegida
        "compartido": body.get("compartido", False),
        "modoDivision": body.get("modoDivision") or None,  # agregado
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



#=========== AGREGAR OBJETIVO =============
@api.post("/users/me/objetivos")
@require_auth
def add_objetivo():
    import math
    body = request.get_json() or {}
    now = datetime.utcnow()
    año, mes, semestre = now.year, now.month, obtener_semestre(now.month)

    # Normalización del valor UF
    valorUF = None
    if body.get("moneda") == "UF":
        try:
            valorUF = round(float(body.get("valorUF", 0)), 2)
        except Exception:
            valorUF = None

    # Parseo y saneo de monto/tiempo
    monto = round(float(body.get("monto", 0)), 0)
    tiempo = body.get("tiempo")
    try:
        tiempo = int(tiempo) if tiempo is not None else None
        if tiempo is not None and tiempo < 1:
            tiempo = 1
    except Exception:
        tiempo = None

    cuota_inicial = None
    if tiempo and monto > 0:
        cuota_inicial = math.ceil(monto / max(1, tiempo))

    data = {
        "tipo": "objetivo",
        "nombre": body.get("nombre"),
        "monto": monto,
        "montoUF": body.get("montoUF") or None,
        "valorUF": valorUF or None,
        "moneda": body.get("moneda", "CLP"),
        "categoria": body.get("categoria"),
        "tiempo": tiempo,  # meses propuestos
        "compartido": body.get("compartido", False),
        "modoDivision": body.get("modoDivision") or None,
        "participantes": body.get("participantes", []),  # [{nombre, porcentaje|monto}]
        "fecha": now.isoformat(),
        "año": año,
        "mes": mes,
        "semestre": semestre,
        "createdAt": firestore.SERVER_TIMESTAMP,
        # 👇 nuevo: estado de planificación
        "plan": {
            "fechaInicio": now.isoformat(),
            "mesesObjetivo": tiempo,            # espejo de 'tiempo'
            "cuotaRecomendada": cuota_inicial,  # recalculable
            "estrategia": "mantener_plazo",
            "recuperarEnMeses": None
        }
    }

    mov_ref = (
        db.collection("users")
        .document(request.uid)
        .collection("movimientos")
        .document()
    )
    mov_ref.set(data)
    return {"ok": True, "id": mov_ref.id}, 201



# ========= OBTENER OBJETIVOS (enriquecidos + categoría) ========= #
@api.get("/users/me/objetivos")
@require_auth
def get_objetivos():
    """
    - Mantiene compatibilidad: mismos campos + agrega derivados.
    - Derivados: progresoGlobal, restanteGlobal, mesesRestantes,
                 plan.cuotaRecomendada (recalculada si falta),
                 fechaFinEstimada, aportesPorParticipante (dict).
    """
    from datetime import datetime, timezone

    def months_between(d1: datetime, d2: datetime) -> int:
        # meses completos entre d1 y d2
        y = d2.year - d1.year
        m = d2.month - d1.month
        r = y * 12 + m
        if d2.day < d1.day:
            r -= 1
        return max(0, r)

    def add_months(d: datetime, months: int) -> datetime:
        # suma meses sin dependencias externas
        y = d.year + (d.month - 1 + months) // 12
        m = (d.month - 1 + months) % 12 + 1
        day = min(d.day, [31,
                          29 if (y % 4 == 0 and (y % 100 != 0 or y % 400 == 0)) else 28,
                          31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m-1])
        return datetime(y, m, day, d.hour, d.minute, d.second, d.microsecond, tzinfo=d.tzinfo)

    def parse_iso_or_now(s: str | None) -> datetime:
        if not s:
            return datetime.now(timezone.utc)
        try:
            # admite 'Z'
            if s.endswith('Z'):
                s = s.replace('Z', '+00:00')
            dt = datetime.fromisoformat(s)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except Exception:
            return datetime.now(timezone.utc)

    try:
        uid = request.uid
        user_ref = db.collection("users").document(uid)
        movs_ref = user_ref.collection("movimientos")

        # 1) Categorías de objetivo
        categorias_ref = (
            db.collection("users")
            .document(uid)
            .collection("categorias")
            .where("tipo", "==", "objetivo")
            .stream()
        )
        categorias = {c.id: c.to_dict() for c in categorias_ref}

        # 2) Objetivos (en movimientos)
        objetivos_docs = list(
            movs_ref.where("tipo", "==", "objetivo").stream()
        )

        # 3) Todos los ahorros para poder agrupar por objetivo
        ahorros_docs = list(
            movs_ref.where("tipo", "==", "ahorro").stream()
        )
        ahorros = [d.to_dict() | {"_id": d.id} for d in ahorros_docs]

        objetivos = []
        now_utc = datetime.now(timezone.utc)

        for doc in objetivos_docs:
            data = doc.to_dict()
            oid = doc.id
            data["id"] = oid

            # Categoría asociada (tu lógica actual, intacta)
            categoria_id = data.get("categoria")
            cat_data = categorias.get(categoria_id)
            if cat_data:
                data["color"] = cat_data.get("color")
                data["icono"] = cat_data.get("icono")
                data["categoriaNombre"] = cat_data.get("nombre")
            else:
                data["color"] = "#00bcd4"
                data["icono"] = "🎯"
                data["categoriaNombre"] = "Sin categoría"

            # ===== Derivados =====
            total = round(float(data.get("monto", 0)) or 0, 0)

            # Ahorros de ESTE objetivo
            ah_este = [a for a in ahorros if a.get("objetivoId") == oid]

            # Progreso global
            progreso_global = sum(int(round(float(a.get("monto", 0)) or 0)) for a in ah_este)
            restante_global = max(0, int(total) - int(progreso_global))

            # Plan (tolerante a objetivos antiguos sin plan)
            plan = (data.get("plan") or {}).copy()
            fecha_inicio = parse_iso_or_now(plan.get("fechaInicio") or data.get("fecha"))
            meses_obj = plan.get("mesesObjetivo") or data.get("tiempo") or 1
            try:
                meses_obj = int(meses_obj)
            except Exception:
                meses_obj = 1

            meses_trans = months_between(fecha_inicio, now_utc)
            meses_rest = max(1, meses_obj - meses_trans)

            # Cuota recomendada (si no viene, la calculamos)
            cuota = plan.get("cuotaRecomendada")
            if cuota is None:
                cuota = (int((restante_global + meses_rest - 1) // meses_rest)  # ceil sin math
                         if restante_global > 0 else 0)

            # Fecha fin estimada
            fin_est = add_months(now_utc, meses_rest).date().isoformat()

            # Resumen por participante (para “mi parte” en el front)
            aportes_por_participante = {}
            for a in ah_este:
                p = a.get("participante") or "_sin_participante_"
                aportes_por_participante[p] = aportes_por_participante.get(p, 0) + int(a.get("monto", 0) or 0)

            # Ensamblar respuesta (manteniendo compatibilidad)
            data["plan"] = {
                **plan,
                "mesesObjetivo": meses_obj,
                "cuotaRecomendada": int(cuota)
            }
            data["progresoGlobal"] = int(progreso_global)
            data["restanteGlobal"] = int(restante_global)
            data["mesesObjetivo"] = int(meses_rest)
            data["fechaFinEstimada"] = fin_est
            data["aportesPorParticipante"] = aportes_por_participante  # <- útil para “mi parte”

            objetivos.append(data)

        return {"ok": True, "objetivos": objetivos}, 200

    except Exception as e:
        print("Error al obtener objetivos:", e)
        return {"ok": False, "error": str(e)}, 500

# ===================== OBTENER DETALLE DEL OBJETIVO (VERSIÓN FINAL) =====================
@api.get("/users/me/objetivos/<obj_id>")
@require_auth
def get_objetivo_detalle(obj_id):
    """
    Devuelve el detalle completo de un objetivo (tipo 'objetivo'),
    incluyendo progreso, plan actual y reajustes automáticos:
      - Detecta cuando el aporte mensual fue menor o mayor al recomendado.
      - Reajusta la cuota y/o los meses restantes según corresponda.
      - Calcula meses restantes correctamente (año/mes/día).
    """
    try:
        uid = request.uid
        user_ref = db.collection("users").document(uid)
        movs_ref = user_ref.collection("movimientos")
        obj_ref = movs_ref.document(obj_id)

        # 🟢 Obtener el documento del objetivo
        obj_doc = obj_ref.get()
        if not obj_doc.exists or obj_doc.to_dict().get("tipo") != "objetivo":
            return {"ok": False, "error": "Objetivo no encontrado"}, 404

        objetivo = obj_doc.to_dict()
        plan = objetivo.get("plan", {}) or {}

        # ==================== DATOS BASE ====================
        meta_total = float(objetivo.get("monto", 0))
        fecha_inicio = parse_iso(plan.get("fechaInicio")) or now_tz("America/Santiago")
        meses_obj = int(plan.get("mesesObjetivo", objetivo.get("tiempo", 1)) or 1)

        # 📆 Calcular meses transcurridos y restantes correctamente (considerando día/mes/año)
        ahora = now_tz("America/Santiago")
        meses_trans = (ahora.year - fecha_inicio.year) * 12 + (ahora.month - fecha_inicio.month)
        if ahora.day < fecha_inicio.day:
            meses_trans = max(0, meses_trans - 1)
        meses_rest = max(1, meses_obj - meses_trans)

        # 🔍 Obtener aportes del objetivo
        aportes_docs = list(
            movs_ref.where("tipo", "==", "ahorro")
                    .where("objetivoId", "==", obj_id)
                    .stream()
        )
        aportes_all = [d.to_dict() for d in aportes_docs]
        total_aportado = sum(a.get("monto", 0) for a in aportes_all)
        restante_global = max(0, meta_total - total_aportado)
        progreso_global = total_aportado

        # ==================== REAJUSTE AUTOMÁTICO ====================
        inicio_mes, fin_mes = rango_mes_actual_tz("America/Santiago")
        aport_mes = [
            a for a in aportes_all
            if a.get("fecha") and inicio_mes <= parse_iso(a["fecha"]) < fin_mes
        ]
        aporte_mes_total = sum(a.get("monto", 0) for a in aport_mes)
        cuota_actual = plan.get("cuotaRecomendada", 0)
        ultimo_reajuste = plan.get("ultimoReajuste")

        año_actual, mes_actual = ahora.year, ahora.month
        año_ultimo = int(str(ultimo_reajuste).split("-")[0]) if ultimo_reajuste else None
        mes_ultimo = int(str(ultimo_reajuste).split("-")[1]) if ultimo_reajuste else None

        # Condición: ha pasado al menos un mes desde el último reajuste
        paso_mes = (
            not ultimo_reajuste
            or (año_actual > año_ultimo)
            or (año_actual == año_ultimo and mes_actual > mes_ultimo)
        )

        # ==================== LÓGICA DE REAJUSTE ====================

        # Detectar diferencia entre aporte real y cuota esperada
        diferencia = 0
        if cuota_actual > 0:
            diferencia = abs(aporte_mes_total - cuota_actual) / cuota_actual

        # 🔸 Caso 1: Aporte menor al recomendado → marcar pendiente
        if meses_trans > 0 and aporte_mes_total < cuota_actual * 0.95 and paso_mes:
            plan["reajustePendiente"] = True
            plan["ultimoReajuste"] = f"{año_actual}-{mes_actual:02d}"
            obj_ref.update({
                "plan.reajustePendiente": True,
                "plan.ultimoReajuste": plan["ultimoReajuste"]
            })
            print(f"⚠️ Reajuste pendiente (aporte insuficiente) para {obj_id}")

        # 🔹 Caso 2: Aporte mayor al recomendado → acortar plazo o reducir cuota
        elif aporte_mes_total > cuota_actual * 1.05 and paso_mes:
            exceso = aporte_mes_total - cuota_actual
            meses_reducir = min(int(exceso // max(1, cuota_actual)), meses_rest - 1)

            if meses_reducir > 0:
                meses_rest -= meses_reducir
                plan["mesesRestantes"] = meses_rest
                nueva_cuota = math.ceil(restante_global / max(1, meses_rest))
                plan["cuotaRecomendada"] = nueva_cuota
                plan["ultimoReajuste"] = f"{año_actual}-{mes_actual:02d}"
                plan["reajustePendiente"] = False

                obj_ref.update({
                    "plan.mesesRestantes": meses_rest,
                    "plan.cuotaRecomendada": nueva_cuota,
                    "plan.ultimoReajuste": plan["ultimoReajuste"],
                    "plan.reajustePendiente": False
                })
                print(f"✅ Aporte superior detectado: reducido {meses_reducir} meses y nueva cuota {nueva_cuota}")

        # 🔹 Caso 3: Cuota no calculada o inconsistente → recalcular
        elif cuota_actual <= 0 or "cuotaRecomendada" not in plan:
            nueva_cuota = math.ceil(restante_global / max(1, meses_rest))
            plan["cuotaRecomendada"] = nueva_cuota
            obj_ref.update({"plan.cuotaRecomendada": nueva_cuota})
            print(f"🔄 Cuota inicial calculada: {nueva_cuota}")

        # ==================== ACTUALIZAR DATOS ====================
        plan["mesesObjetivo"] = meses_rest
        objetivo["plan"] = plan

        # 🧾 Respuesta final
        return {
            "ok": True,
            "objetivo": {
                **objetivo,
                "id": obj_id,
                "progresoGlobal": progreso_global,
                "restanteGlobal": restante_global,
            },
        }, 200

    except Exception as e:
        print("🔥 Error al obtener detalle del objetivo:", e)
        return {"ok": False, "error": str(e)}, 500



# ========= REAJUSTAR PLAN (sin aporte) ==========
@api.post("/users/me/objetivos/<obj_id>/reajustar_plan")
@require_auth
def reajustar_plan(obj_id):
    """
    Permite recalcular la planificación de un objetivo sin realizar aportes reales.
    Se usa cuando el usuario elige redistribuir o ajustar plazo.
    """
    uid = request.uid
    body = request.get_json() or {}
    estrategia = body.get("estrategia", "mantener_plazo")
    recuperar_en = body.get("recuperarEnMeses")

    user_ref = db.collection("users").document(uid)
    movs_ref = user_ref.collection("movimientos")
    obj_ref = movs_ref.document(obj_id)

    try:
        obj_snap = obj_ref.get()
        if not obj_snap.exists or obj_snap.to_dict().get("tipo") != "objetivo":
            return {"ok": False, "error": "Objetivo no encontrado"}, 404

        objetivo = obj_snap.to_dict()
        plan = (objetivo.get("plan") or {}).copy()
        meta_total = float(objetivo.get("monto", 0))

        # calcular progreso global actual
        aportes_ref = movs_ref.where("tipo", "==", "ahorro").where("objetivoId", "==", obj_id)
        docs = list(aportes_ref.stream())
        progreso_total = sum(d.to_dict().get("monto", 0) for d in docs)

        restante = max(0, meta_total - progreso_total)
        fecha_inicio = parse_iso(plan.get("fechaInicio"))
        meses_trans = meses_entre(fecha_inicio, now_tz("America/Santiago"))
        meses_obj = int(plan.get("mesesObjetivo") or 1)
        meses_rest = max(1, meses_obj - meses_trans)

        plan_nuevo = plan.copy()
        if estrategia == "mantener_plazo":
            cuota_nueva = math.ceil(restante / meses_rest)
            plan_nuevo["cuotaRecomendada"] = cuota_nueva
        elif estrategia == "ajustar_plazo":
            nuevos_meses = int(recuperar_en or meses_obj)
            plan_nuevo["mesesObjetivo"] = nuevos_meses
            mrest2 = max(1, nuevos_meses - meses_trans)
            plan_nuevo["cuotaRecomendada"] = math.ceil(restante / mrest2)

        plan_nuevo["reajustePendiente"] = False
        plan_nuevo["ultimoReajuste"] = f"{datetime.now().year}-{datetime.now().month:02d}"

        # Guardar cambios
        obj_ref.update({"plan": plan_nuevo})

        return {"ok": True, "plan": plan_nuevo, "restante": restante, "progresoGlobal": progreso_total}, 200

    except Exception as e:
        print("🔥 Error en reajustar_plan:", e)
        return {"ok": False, "error": str(e)}, 400



# ===================== MARCAR REAJUSTE COMO PROCESADO =====================
@api.post("/users/me/objetivos/<obj_id>/marcar_reajuste")
@require_auth
def marcar_reajuste_procesado(obj_id):
    """
    Marca un reajuste como procesado y recalcula la cuota recomendada
    en base a los meses restantes reales (solo si cambió el mes).
    Si el mes actual es el mismo que el último reajuste, no descuenta
    meses nuevamente.
    """
    import math
    from datetime import datetime

    try:
        uid = request.uid
        user_ref = db.collection("users").document(uid)
        movs_ref = user_ref.collection("movimientos")
        obj_ref = movs_ref.document(obj_id)

        # 🟢 Obtener el objetivo
        obj_doc = obj_ref.get()
        if not obj_doc.exists or obj_doc.to_dict().get("tipo") != "objetivo":
            return {"ok": False, "error": "Objetivo no encontrado"}, 404

        objetivo = obj_doc.to_dict()
        plan = objetivo.get("plan", {})
        meta_total = float(objetivo.get("monto", 0))

        # 🕒 Obtener datos temporales
        fecha_inicio = parse_iso(plan.get("fechaInicio"))
        meses_obj = int(plan.get("mesesObjetivo", objetivo.get("tiempo", 1)) or 1)
        ahora = now_tz("America/Santiago")

        # 📅 Evitar reducir meses más de una vez por mes
        ultimo_reajuste = plan.get("ultimoReajuste")
        año_ultimo, mes_ultimo = (None, None)
        if ultimo_reajuste:
            try:
                año_ultimo = int(str(ultimo_reajuste).split("-")[0])
                mes_ultimo = int(str(ultimo_reajuste).split("-")[1])
            except Exception:
                pass

        # Si ya se reajustó este mes, no tocar meses
        if año_ultimo == ahora.year and mes_ultimo == ahora.month:
            meses_rest = int(plan.get("mesesObjetivo", meses_obj))
        else:
            # ⚙️ Calcular meses transcurridos correctamente
            meses_trans = (ahora.year - fecha_inicio.year) * 12 + (ahora.month - fecha_inicio.month)
            meses_rest = max(1, meses_obj - meses_trans)

        # 🔍 Obtener aportes del objetivo
        aportes_docs = list(
            movs_ref.where("tipo", "==", "ahorro")
                    .where("objetivoId", "==", obj_id)
                    .stream()
        )
        aportes = [d.to_dict() for d in aportes_docs]
        total_aportado = sum(float(a.get("monto", 0)) for a in aportes)
        restante_global = max(0, meta_total - total_aportado)

        # 🧮 Recalcular nueva cuota
        nueva_cuota = math.ceil(restante_global / max(1, meses_rest))

        # 🔄 Actualizar plan
        plan["cuotaRecomendada"] = nueva_cuota
        plan["mesesObjetivo"] = meses_rest
        plan["reajustePendiente"] = False
        plan["ultimoReajuste"] = f"{ahora.year}-{ahora.month:02d}"

        # Guardar en Firestore
        obj_ref.update({"plan": plan})

        print(
            f"✅ Reajuste procesado para {obj_id}: nueva cuota {nueva_cuota} CLP/mes "
            f"({meses_rest} meses restantes)"
        )

        # 🧾 Devolver objetivo actualizado
        return {
            "ok": True,
            "objetivo": {
                **objetivo,
                "plan": plan,
                "progresoGlobal": total_aportado,
                "restanteGlobal": restante_global,
            },
        }, 200

    except Exception as e:
        print("🔥 Error al marcar reajuste como procesado:", e)
        return {"ok": False, "error": str(e)}, 500

# ===================== Obtener aportes del objetivo =====================
@api.get("/users/me/objetivos/<obj_id>/ahorros")
@require_auth
def get_ahorros_objetivo(obj_id):
    """
    Devuelve la lista de aportes registrados para un objetivo específico.
    """
    try:
        uid = request.uid
        movs_ref = db.collection("users").document(uid).collection("movimientos")
        # legacy: objetivos/<id>/aportes eliminado; ahora leemos desde 'movimientos'

        try:
            q = (movs_ref
                 .where("tipo", "==", "ahorro")
                 .where("objetivoId", "==", obj_id)
                 .order_by("fecha", direction=firestore.Query.DESCENDING))
            docs = list(q.stream())
        except Exception:
            q = (movs_ref
                 .where("tipo", "==", "ahorro")
                 .where("objetivoId", "==", obj_id))
            docs = list(q.stream())
        items = []

        for doc in docs:
            data = doc.to_dict()
            data["id"] = doc.id
            # 🔹 Convertir fecha a string ISO
            fecha = data.get("fecha")
            if fecha:
                try:
                    data["fecha"] = fecha.isoformat()
                except Exception:
                    data["fecha"] = str(fecha)
            items.append(data)

        # ordenar por fecha si no se pudo usar order_by en Firestore
        items.sort(key=lambda x: x.get("fecha") or "", reverse=True)
        return jsonify({"ok": True, "items": items}), 200

    except Exception as e:
        print("❌ Error en /objetivos/<id>/ahorros:", e)
        return jsonify({"error": str(e)}), 500


# ======== ACTUALIZAR MOVIMIENTO (objetivo, ahorro, gasto, etc.) ========
@api.patch("/users/me/movimientos/<mov_id>")
@require_auth
def update_movimiento(mov_id):
    uid = request.uid
    body = request.get_json() or {}
    ref = db.collection("users").document(uid).collection("movimientos").document(mov_id)

    doc = ref.get()
    if not doc.exists:
        return jsonify({"ok": False, "message": "Movimiento no encontrado"}), 404

    data = doc.to_dict()
    tipo = data.get("tipo")

    # Solo permitir campos seguros para cada tipo
    campos_permitidos = {}

    if tipo == "objetivo":
        campos_permitidos = {"nombre", "monto", "tiempo", "categoria", "plan"}
    elif tipo == "ahorro":
        campos_permitidos = {"monto"}  # solo monto editable
    elif tipo in {"gasto", "ingreso", "deuda"}:
        campos_permitidos = {"monto", "origen", "categoria", "frecuencia"}
    else:
        return jsonify({"ok": False, "message": f"Tipo '{tipo}' no editable"}), 400

    # Filtrar los campos no permitidos
    update_data = {k: v for k, v in body.items() if k in campos_permitidos}
    if not update_data:
        return jsonify({"ok": False, "message": "Sin campos válidos para actualizar"}), 400

    ref.update(update_data)
    return jsonify({"ok": True, "message": "Movimiento actualizado"}), 200



# ======== APORTAR OBJETIVO ========
@api.post("/users/me/objetivos/<obj_id>/aportar")
@require_auth
def aportar_objetivo(obj_id):
    uid = request.uid
    body = request.get_json() or {}
    monto = round(float(body.get("monto", 0)), 0)
    estrategia = body.get("estrategia", "mantener_plazo")
    recuperar_en = body.get("recuperarEnMeses")
    participante = body.get("participante")  # opcional (para compartidos)

    if monto <= 0:
        return {"ok": False, "error": "Monto inválido"}, 400

    user_ref = db.collection("users").document(uid)
    movs_ref = user_ref.collection("movimientos")
    obj_ref = movs_ref.document(obj_id)

    @firestore.transactional
    def _tx(tx):
        # 1️⃣ Leer usuario y objetivo
        user_snap = user_ref.get(transaction=tx)
        saldo = (user_snap.to_dict() or {}).get("saldoDisponible", 0)

        obj_snap = obj_ref.get(transaction=tx)
        if not obj_snap.exists or obj_snap.to_dict().get("tipo") != "objetivo":
            raise ValueError("Objetivo no existe")

        objetivo = obj_snap.to_dict()
        plan = (objetivo.get("plan") or {}).copy()
        moneda = objetivo.get("moneda", "CLP")
        meta_total = round(float(objetivo.get("monto", 0)), 0)

        # 2️⃣ Leer aportes existentes
        inicio_mes, fin_mes = rango_mes_actual_tz("America/Santiago")
        q_all = movs_ref.where("tipo", "==", "ahorro").where("objetivoId", "==", obj_id)
        ahorros_all_docs = tx.get(q_all)
        ahorros_all = [d.to_dict() for d in ahorros_all_docs]

        # Filtrar manualmente los del mes actual
        ahorros_mes = [
            a for a in ahorros_all
            if a.get("fecha") and inicio_mes <= parse_iso(a["fecha"]) < fin_mes
        ]

        progreso_total = sum(a.get("monto", 0) for a in ahorros_all) + monto
        aporte_mes_total = sum(a.get("monto", 0) for a in ahorros_mes) + monto

        # 3️⃣ Calcular nueva planificación
        fecha_inicio = parse_iso(plan.get("fechaInicio")) or datetime.now(datetime.UTC)
        meses_trans = meses_entre(fecha_inicio, now_tz("America/Santiago"))
        meses_obj = plan.get("mesesObjetivo") or objetivo.get("tiempo") or 1
        meses_rest = max(1, int(meses_obj) - meses_trans)

        restante = max(0, meta_total - progreso_total)
        cuota_base = math.ceil(restante / meses_rest) if restante > 0 else 0
        cuota_actual = plan.get("cuotaRecomendada", cuota_base)
        delta = aporte_mes_total - (cuota_actual or 0)

        plan_nuevo = plan.copy()
        # ⚠️ Si ha pasado al menos un mes y el aporte del mes fue menor al recomendado
        if meses_trans > 0 and aporte_mes_total < (plan.get("cuotaRecomendada") or 0):
            plan_nuevo["reajustePendiente"] = True
        else:
            plan_nuevo["reajustePendiente"] = False

        # 🔹 Ajuste del plan según desempeño del aporte
        if delta < 0:
            deficit = -delta
            if estrategia == "mantener_plazo":
                divisor = max(1, meses_rest - 1)
                plan_nuevo["cuotaRecomendada"] = math.ceil(cuota_base + (deficit / divisor))
            elif estrategia == "ajustar_plazo":
                nuevos_meses = int(recuperar_en or 0)
                if nuevos_meses > 0:
                    # El usuario eligió manualmente el nuevo plazo
                    plan_nuevo["mesesObjetivo"] = nuevos_meses
                    mrest2 = max(1, nuevos_meses - meses_trans)
                    plan_nuevo["cuotaRecomendada"] = math.ceil(restante / mrest2) if restante > 0 else 0
                else:
                    # Caso automático (por déficit)
                    if cuota_base <= 0:
                        plan_nuevo["cuotaRecomendada"] = 0
                    else:
                        meses_extra = math.ceil(deficit / cuota_base)
                        plan_nuevo["mesesObjetivo"] = int(meses_obj) + max(1, meses_extra)
                        mrest2 = max(1, plan_nuevo["mesesObjetivo"] - meses_trans)
                        plan_nuevo["cuotaRecomendada"] = math.ceil(restante / mrest2) if restante > 0 else 0

            elif estrategia == "recuperar_en_x_meses":
                R = int(recuperar_en or 1)
                extra = math.ceil(deficit / max(1, R))
                plan_nuevo["recuperarEnMeses"] = R
                plan_nuevo["cuotaRecomendada"] = math.ceil(cuota_base + extra)
            else:
                plan_nuevo["cuotaRecomendada"] = cuota_base
        else:
            # 🔸 Usuario va adelantado → acorta plazo si puede
            if restante > 0 and cuota_base > 0:
                meses_ganados = delta // max(1, cuota_base)
                if meses_ganados > 0:
                    plan_nuevo["mesesObjetivo"] = max(1, int(meses_obj) - meses_ganados)
            mrest2 = max(1, (plan_nuevo.get("mesesObjetivo", meses_obj)) - meses_trans)
            plan_nuevo["cuotaRecomendada"] = math.ceil(restante / mrest2) if restante > 0 else 0

        # 4️⃣ Registrar movimiento con formato estándar
        ahora_cl = now_tz("America/Santiago")
        año, mes, semestre = ahora_cl.year, ahora_cl.month, (1 if ahora_cl.month <= 6 else 2)

        data_ahorro = {
            "tipo": "ahorro",
            "origen": objetivo.get("nombre", "Sin origen"),
            "monto": monto,
            "montoUF": None,
            "valorUF": None,
            "moneda": moneda,
            "categoria": "Ahorros",
            "frecuencia": "unica",
            "compartido": False,
            "modoDivision": None,
            "participantes": [],
            "fecha": ahora_cl.isoformat(),
            "año": año,
            "mes": mes,
            "semestre": semestre,
            "createdAt": firestore.SERVER_TIMESTAMP,
            "objetivoId": obj_id,
        }

        if participante:
            data_ahorro["participante"] = participante

        ah_ref = movs_ref.document()
        tx.set(ah_ref, data_ahorro)

        # Actualizar objetivo y saldo
        tx.update(obj_ref, {"plan": plan_nuevo})
        nuevo_saldo = (saldo or 0) - monto
        tx.update(user_ref, {"saldoDisponible": nuevo_saldo})

        return {
            "aporteEsperadoMes": int(cuota_actual or 0),
            "aporteMes": int(aporte_mes_total),
            "delta": int(delta),
            "plan": plan_nuevo,
            "restante": int(restante),
            "saldoDisponible": int(nuevo_saldo),
        }

    try:
        res = _tx(db.transaction())

        # 🟢 Asegurar categoría 'Ahorros' para usuarios existentes
        try:
            cats_ref = db.collection("users").document(uid).collection("categorias")
            cats = list(cats_ref.stream())
            nombres = {(c.to_dict() or {}).get("nombre") for c in cats}
            if "Ahorro" not in nombres and "Ahorros" not in nombres:
                cats_ref.document().set({
                    "tipo": "movimiento",
                    "nombre": "Ahorros",
                    "icono": "wallet-outline",
                    "color": "#1abc9c",
                    "createdAt": firestore.SERVER_TIMESTAMP,
                })
        except Exception:
            pass

        return {"ok": True, **res}, 201

    except Exception as e:
        print("🔥 Error en aportar_objetivo:", e)
        return {"ok": False, "error": str(e)}, 400




# ======== ELIMINAR OBJETIVO ========
@api.delete("/users/me/objetivos/<obj_id>")
@require_auth
def delete_objetivo(obj_id):
    uid = request.uid
    ref = db.collection("users").document(uid).collection("movimientos").document(obj_id)
    ref.delete()
    return jsonify({"ok": True, "message": "Objetivo eliminado"}), 200


# ========== OBTENER RESUMEN MENSUAL ==========
@api.get("/users/me/resumen")
@require_auth
def get_resumen_mensual():
    """
    Devuelve un resumen del mes actual para el usuario:
    - Total de ingresos, gastos, deudas (solo cuotas del mes), restante.
    - Desglose por categoría (solo de los que restan dinero).
    """
    try:
        uid = request.uid
        now = datetime.utcnow()
        año, mes = now.year, now.month

        print(f"📆 Resumen solicitado para UID={uid}, año={año}, mes={mes}")

        movs_ref = db.collection("users").document(uid).collection("movimientos")

        # ⚙️ Query solo de este mes y año
        query_ref = (
            movs_ref.where("`año`", "==", año)
                    .where("mes", "==", mes)
        )


        docs = list(query_ref.stream())

        if not docs:
            print("⚠️ No se encontraron movimientos este mes.")
            return {
                "ok": True,
                "ingresos": 0,
                "gastos": 0,
                "deudas": 0,
                "restante": 0,
                "porCategoria": {},
            }, 200

        # ========= Inicialización del resumen =========
        resumen = {
            "ingresos": 0,
            "gastos": 0,
            "deudas": 0,          # cuotas mensuales calculadas
            "ahorros": 0,
            "restante": 0,
            "porCategoria": {},
        }

        # ========= Recorrer movimientos =========
        for doc in docs:
            data = doc.to_dict()
            tipo = data.get("tipo")
            monto = float(data.get("monto", 0))
            categoria = data.get("categoria")

            # 💰 Ingresos
            if tipo == "ingreso":
                resumen["ingresos"] += monto

            # 💸 Gastos (se descuentan completos)
            elif tipo == "gasto":
                resumen["gastos"] += monto
                if categoria:
                    resumen["porCategoria"].setdefault(categoria, 0)
                    resumen["porCategoria"][categoria] += monto

            elif tipo == "ahorro":
                # Tratar ahorros como salida de dinero para el disponible y mostrarlos en Home
                resumen["ahorros"] += monto
                resumen["gastos"] += monto
                resumen["porCategoria"].setdefault("Ahorros", 0)
                resumen["porCategoria"]["Ahorros"] += monto

            # 🧾 Deudas (solo cuota mensual)
            elif tipo == "deuda":
                cuotas = int(data.get("cuotas") or 1)
                if cuotas > 0:
                    cuota_mensual = monto / cuotas
                else:
                    cuota_mensual = monto

                resumen["deudas"] += cuota_mensual

        # ========= Calcular restante =========
        resumen["restante"] = resumen["ingresos"] - (resumen["gastos"] + resumen["deudas"])

        print("🧾 Resumen final:", resumen)


        return {"ok": True, **resumen}, 200

    except Exception as e:
        print("❌ Error obteniendo resumen:", e)
        return {"ok": False, "error": str(e)}, 500





# ========== OBTENER MOVIMIENTOS POR CATEGORIA (BARRA HOME) ==========
@api.get("/users/me/movimientos")
@require_auth
def obtener_movimientos_por_categoria():
    categoria = request.args.get("categoria")
    if not categoria:
        return {"error": "Falta la categoría"}, 400

    try:
        uid = request.uid
        now = datetime.utcnow()
        año, mes = now.year, now.month

        print(f"📆 Solicitando movimientos para '{categoria}' ({año}-{mes})")

        movs_ref = db.collection("users").document(uid).collection("movimientos")
        movimientos = []

        # Manejo directo para Ahorros
        if categoria.lower() in ("ahorro", "ahorros"):
            query_ref = (
                movs_ref
                .where("tipo", "==", "ahorro")
                .where("`año`", "==", año)
                .where("mes", "==", mes)
            )
            docs = list(query_ref.stream())
            movimientos = [doc.to_dict() for doc in docs]
            movimientos.sort(key=lambda x: x.get("fecha"), reverse=True)
            return movimientos, 200

        # 🟥 Caso especial: deudas → tipo == "deuda"
        if categoria.lower() == "deudas":
            query_ref = (
                movs_ref
                .where("tipo", "==", "deuda")
                .where("`año`", "==", año)
                .where("mes", "==", mes)
            )
            docs = list(query_ref.stream())

            for doc in docs:
                data = doc.to_dict()
                monto = float(data.get("monto", 0) or 0)
                cuotas = int(data.get("cuotas") or 1)
                cuota_mensual = monto / cuotas if cuotas > 0 else monto

                movimientos.append({
                    **data,
                    "monto_original": monto,
                    "monto": round(cuota_mensual, 2),
                    "descripcion": f"Cuota mensual ({cuotas} cuotas)"
                })

        # 🟢 Caso normal: categoría → tipo == "gasto"
        else:
            query_ref = (
                movs_ref
                .where("tipo", "==", "gasto")     # 👈 esto faltaba
                .where("categoria", "==", categoria)
                .where("`año`", "==", año)
                .where("mes", "==", mes)
            )
            docs = list(query_ref.stream())
            movimientos = [doc.to_dict() for doc in docs]

        # 🔁 Ordenar por fecha descendente
        movimientos.sort(key=lambda x: x.get("fecha"), reverse=True)

        print(f"✅ {len(movimientos)} movimientos encontrados para '{categoria}'")
        return movimientos, 200

    except Exception as e:
        print("❌ Error en obtener_movimientos_por_categoria:", e)
        return {"error": str(e)}, 500






# ===================== Movimientos Históricos =====================
@api.get("/users/me/movimientos/historico")
@require_auth
def get_movimientos_historico():
    """
    Devuelve todos los movimientos del usuario autenticado desde la subcolección 'movimientos'.
    """
    try:
        uid = request.uid
        if not uid:
            return jsonify({"error": "UID no proporcionado"}), 400

        user_ref = db.collection("users").document(uid)
        mov_ref = user_ref.collection("movimientos")

        docs = mov_ref.stream()
        movimientos = []

        for doc in docs:
            mov = doc.to_dict() or {}
            mov["id"] = doc.id
            mov["categoria"] = mov.get("categoria", "Sin categoría")
            mov["tipo"] = mov.get("tipo", "sin-tipo")
            mov["origen"] = mov.get("origen", "Sin origen")
            mov["monto"] = mov.get("monto", 0)
            mov["moneda"] = mov.get("moneda", "CLP")

            # ✅ Convertir fecha correctamente
            fecha = mov.get("fecha")
            if fecha:
                try:
                    # Firestore DatetimeWithNanoseconds → ISO string UTC
                    mov["fecha"] = fecha.isoformat()
                except Exception:
                    # Si ya viene como string, la dejamos
                    mov["fecha"] = str(fecha)
            else:
                mov["fecha"] = None

            movimientos.append(mov)

        # ✅ Ordenar usando string ISO (seguro y consistente)
        movimientos.sort(key=lambda x: x.get("fecha") or "", reverse=True)

        return jsonify(movimientos), 200

    except Exception as e:
        print("❌ Error en /users/me/movimientos/historico:", e)
        return jsonify({"error": str(e)}), 500



# ========== ELIMINAR MOVIMIENTO ==========
@api.delete("/users/me/movimientos/<mov_id>")
@require_auth
def eliminar_movimiento(mov_id):
    """
    Elimina un movimiento específico (gasto, ingreso, deuda u objetivo)
    y actualiza los valores del resumen mensual correspondiente.
    """
    try:
        uid = request.uid
        user_ref = db.collection("users").document(uid)
        mov_ref = user_ref.collection("movimientos").document(mov_id)
        mov_doc = mov_ref.get()

        if not mov_doc.exists:
            return {"error": "Movimiento no encontrado"}, 404

        mov_data = mov_doc.to_dict()
        tipo = mov_data.get("tipo")
        monto = float(mov_data.get("monto", 0))
        año = mov_data.get("año")
        mes = mov_data.get("mes")

        # Eliminar el movimiento
        mov_ref.delete()

        # Actualizar resumen (inverso)
        resumen_ref = user_ref.collection("resumenes").document(f"{año}-{mes}")
        resumen_doc = resumen_ref.get()

        if resumen_doc.exists:
            resumen_data = resumen_doc.to_dict()

            # Ajustar según tipo
            if tipo == "ingreso":
                resumen_data["ingresos"] = resumen_data.get("ingresos", 0) - monto
            elif tipo == "gasto":
                resumen_data["gastos"] = resumen_data.get("gastos", 0) - monto
            elif tipo == "deuda":
                resumen_data["deudas"] = resumen_data.get("deudas", 0) - monto
            elif tipo == "objetivo":
                resumen_data["gastos"] = resumen_data.get("gastos", 0) - monto  # opcional: metas pueden ir como gasto
            elif tipo == "ahorro":
                resumen_data["gastos"] = resumen_data.get("gastos", 0) - monto

            # Recalcular ahorro (ingresos - gastos - deudas)
            ingresos = resumen_data.get("ingresos", 0)
            gastos = resumen_data.get("gastos", 0)
            deudas = resumen_data.get("deudas", 0)
            resumen_data["ahorro"] = ingresos - gastos - deudas

            resumen_ref.set(resumen_data, merge=True)

        return {"ok": True, "message": "Movimiento eliminado y resumen actualizado"}, 200

    except Exception as e:
        print("❌ Error en eliminar_movimiento:", e)
        return {"error": str(e)}, 500









#============================================= HELPER =============================================#

#================= HELPER OBJETIVO ======================#
import math
import pytz
from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta

def now_tz(tzname: str = "America/Santiago"):
    return datetime.now(pytz.timezone(tzname))

def rango_mes_actual_tz(tzname: str = "America/Santiago"):
    tz = pytz.timezone(tzname)
    now = now_tz(tzname)
    inicio = tz.localize(datetime(now.year, now.month, 1, 0, 0, 0))
    fin = inicio + relativedelta(months=1)
    return inicio, fin

def meses_entre(d1: datetime, d2: datetime) -> int:
    """Calcula los meses transcurridos entre dos fechas sin restar de más."""
    if d1.tzinfo is None: 
        d1 = d1.replace(tzinfo=timezone.utc)
    if d2.tzinfo is None: 
        d2 = d2.replace(tzinfo=timezone.utc)

    y = d2.year - d1.year
    m = d2.month - d1.month
    total = y * 12 + m

    # ✅ Solo restar si aún no pasó al menos un día del mes siguiente
    if d2.day < d1.day and total > 0:
        total -= 1

    return max(0, total)


def parse_iso(s: str | None) -> datetime | None:
    if not s: return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None


# ======== RECALCULAR PLAN DEL OBJETIVO ========
@api.post("/users/me/objetivos/<obj_id>/recalcular")
@require_auth
def recalcular_plan_objetivo(obj_id):
    """
    🔄 Recalcula la cuota mensual recomendada (cuotaRecomendada)
    del objetivo según los aportes realizados, la meta total
    y los meses restantes reales.
    También actualiza el último reajuste y desmarca el pendiente.
    """
    import math
    from datetime import datetime

    try:
        uid = request.uid
        user_ref = db.collection("users").document(uid)
        movs_ref = user_ref.collection("movimientos")
        obj_ref = movs_ref.document(obj_id)

        # 🟢 Obtener el objetivo
        obj_doc = obj_ref.get()
        if not obj_doc.exists or obj_doc.to_dict().get("tipo") != "objetivo":
            return {"ok": False, "error": "Objetivo no encontrado"}, 404

        objetivo = obj_doc.to_dict()
        plan = objetivo.get("plan", {})
        meta_total = float(objetivo.get("monto", 0))

        # Fecha de inicio y tiempo total del plan
        fecha_inicio = parse_iso(plan.get("fechaInicio"))
        meses_obj = int(plan.get("mesesObjetivo", objetivo.get("tiempo", 1)) or 1)

        # 🕒 Calcular meses transcurridos y restantes
        ahora = now_tz("America/Santiago")
        meses_trans = meses_entre(fecha_inicio, ahora)
        meses_rest = max(1, meses_obj - meses_trans)

        # 🔍 Obtener aportes de este objetivo
        aportes_docs = list(
            movs_ref.where("tipo", "==", "ahorro")
                    .where("objetivoId", "==", obj_id)
                    .stream()
        )
        aportes = [d.to_dict() for d in aportes_docs]

        total_aportado = sum(float(a.get("monto", 0)) for a in aportes)
        restante_global = max(0, meta_total - total_aportado)

        # 🧮 Recalcular cuota recomendada según meses restantes
        nueva_cuota = math.ceil(restante_global / max(1, meses_rest))

        # 🔄 Actualizar plan
        plan["cuotaRecomendada"] = nueva_cuota
        plan["mesesObjetivo"] = meses_rest
        plan["reajustePendiente"] = False
        plan["ultimoReajuste"] = f"{ahora.year}-{ahora.month:02d}"

        # Guardar cambios en Firestore
        obj_ref.update({"plan": plan})

        print(f"✅ Objetivo {obj_id} recalculado → {nueva_cuota} CLP/mes (restante {restante_global}, meses {meses_rest})")

        # 🧾 Devolver respuesta actualizada
        return {
            "ok": True,
            "objetivo": {
                **objetivo,
                "plan": plan,
                "progresoGlobal": total_aportado,
                "restanteGlobal": restante_global,
            }
        }, 200

    except Exception as e:
        print("🔥 Error al recalcular plan:", e)
        return {"ok": False, "error": str(e)}, 500


# --- Registrar blueprint ---
app.register_blueprint(api)

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8080"))
    app.run(host="0.0.0.0", port=port, debug=True)




