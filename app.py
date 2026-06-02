from flask import Flask, render_template, request, jsonify
from datetime import datetime, timedelta

app = Flask(__name__)

# Base de datos en memoria para los turnos
# Formato: { "YYYY-MM-DD": { "HH:MM": { "nombre": str, "email": str, "dni": str } } }
turnos_db = {}

# Base de datos en memoria para usuarios
# Formato: { "email@ejemplo.com": { "nombre": str, "apellido": str, "dni": str, "password": str } }
users_db = {}

# Configuracion de horarios
HORA_INICIO = 8
MINUTO_INICIO = 30
HORA_FIN = 15
INTERVALO_MINUTOS = 30

def generar_horarios():
    """Genera una lista de strings con los horarios disponibles de 8:30 a 15:00 cada 30 min."""
    horarios = []
    actual = datetime.strptime(f"{HORA_INICIO}:{MINUTO_INICIO}", "%H:%M")
    final = datetime.strptime(f"{HORA_FIN}:00", "%H:%M")
    
    while actual <= final:
        horarios.append(actual.strftime("%H:%M"))
        actual += timedelta(minutes=INTERVALO_MINUTOS)
    return horarios

@app.route('/')
def index():
    """Ruta principal que sirve la interfaz web."""
    return render_template('index.html')

@app.route('/api/horarios', methods=['GET'])
def get_horarios():
    """Retorna los horarios teoricos y cuales estan ocupados para una fecha dada."""
    fecha = request.args.get('fecha') # Formato esperado: YYYY-MM-DD
    if not fecha:
        return jsonify({"error": "Fecha requerida"}), 400
    
    todos_los_horarios = generar_horarios()
    ocupados = list(turnos_db.get(fecha, {}).keys())
    
    return jsonify({
        "todos": todos_los_horarios,
        "ocupados": ocupados
    })

@app.route('/api/reservar', methods=['POST'])
def reservar_turno():
    """Reserva un turno en el diccionario en memoria."""
    data = request.json
    fecha = data.get('fecha')
    hora = data.get('hora')
    nombre = data.get('nombre')
    dni = data.get('dni')
    
    if not all([fecha, hora, nombre, dni]):
        return jsonify({"success": False, "message": "Faltan datos obligatorios"}), 400
    
    # Validar que el DNI esté registrado en users_db
    dni_registrado = False
    for user in users_db.values():
        if user['dni'] == dni:
            dni_registrado = True
            break
            
    if not dni_registrado:
        return jsonify({"success": False, "message": "El DNI ingresado no pertenece a un usuario registrado"}), 400
    
    if fecha not in turnos_db:
        turnos_db[fecha] = {}
        
    if hora in turnos_db[fecha]:
        return jsonify({"success": False, "message": "El horario ya está ocupado"}), 400
    
    # Guardamos en memoria
    turnos_db[fecha][hora] = {
        "nombre": nombre,
        "dni": dni,
        "timestamp": datetime.now().isoformat()
    }
    
    return jsonify({"success": True, "message": "Turno reservado con éxito"})

@app.route('/api/consultar', methods=['GET'])
def consultar_turno():
    """Busca un turno por DNI para ver cuándo es."""
    dni = request.args.get('dni')
    if not dni:
        return jsonify({"error": "DNI requerido"}), 400
    
    encontrados = []
    for fecha, horas in turnos_db.items():
        for hora, datos in horas.items():
            if datos['dni'] == dni:
                encontrados.append({"fecha": fecha, "hora": hora})
                
    return jsonify(encontrados)

@app.route('/api/cancelar', methods=['POST'])
def cancelar_turno():
    """Borra un turno de la memoria."""
    data = request.json
    fecha = data.get('fecha')
    hora = data.get('hora')
    dni = data.get('dni')
    
    if fecha in turnos_db and hora in turnos_db[fecha]:
        if turnos_db[fecha][hora]['dni'] == dni:
            del turnos_db[fecha][hora]
            return jsonify({"success": True, "message": "Turno cancelado"})
    
    return jsonify({"success": False, "message": "No se encontró el turno o los datos no coinciden"}), 404

@app.route('/api/register', methods=['POST'])
def register():
    """Registra un nuevo usuario en la base de datos en memoria."""
    data = request.json
    nombre = data.get('nombre')
    apellido = data.get('apellido')
    dni = data.get('dni')
    mail = data.get('mail')
    password = data.get('password')

    if not all([nombre, apellido, dni, mail, password]):
        return jsonify({"success": False, "message": "Todos los campos son obligatorios"}), 400

    if mail in users_db:
        return jsonify({"success": False, "message": "El correo ya está registrado"}), 400

    # En un sistema real la contraseña debe estar hasheada
    users_db[mail] = {
        "nombre": nombre,
        "apellido": apellido,
        "dni": dni,
        "password": password
    }

    return jsonify({
        "success": True, 
        "message": "Usuario registrado exitosamente",
        "user": {"nombre": nombre, "apellido": apellido, "dni": dni, "mail": mail}
    })

@app.route('/api/login', methods=['POST'])
def login():
    """Inicia sesión validando credenciales."""
    data = request.json
    mail = data.get('mail')
    password = data.get('password')

    if not mail or not password:
        return jsonify({"success": False, "message": "Falta correo o contraseña"}), 400

    user = users_db.get(mail)
    if not user or user['password'] != password:
        return jsonify({"success": False, "message": "Credenciales inválidas"}), 401

    return jsonify({
        "success": True,
        "message": "Inicio de sesión exitoso",
        "user": {"nombre": user['nombre'], "apellido": user['apellido'], "dni": user['dni'], "mail": mail}
    })

if __name__ == '__main__':
    # Ejecutamos el servidor en el puerto 5000
    print("Servidor de Turnos de Morón iniciado en http://localhost:5000")
    app.run(debug=True, port=5000)
