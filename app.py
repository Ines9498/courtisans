from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room
import random
import string

app = Flask(__name__, static_folder=".", template_folder=".")
socketio = SocketIO(app, cors_allowed_origins="*")

# Stockage en mémoire des parties
parties = {}

# Fonction utilitaire pour générer un code de partie unique
def generer_code_partie(length=5):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

@app.route('/')
def index():
    return render_template('index.html')

# Création d'une nouvelle partie
@socketio.on('creer_partie')
def handle_creer_partie(data):
    pseudo = data.get("pseudo")
    code = generer_code_partie()

    parties[code] = {
        "joueurs": [{"pseudo": pseudo, "id": 0}],
        "pret": set(),
        "deck": [],
        "joueur_actif": 0
    }

    join_room(code)
    emit("partie_creee", {
        "code": code,
        "idJoueurAttribue": 0
    }, room=request.sid)

    emit("liste_joueurs", [j["pseudo"] for j in parties[code]["joueurs"]], room=code)

# Rejoindre une partie existante
@socketio.on('rejoindre_partie')
def handle_rejoindre_partie(data):
    pseudo = data.get("pseudo")
    code = data.get("code")

    if code not in parties:
        emit("erreur", "Code de partie invalide.")
        return

    if len(parties[code]["joueurs"]) >= 5:
        emit("erreur", "Partie déjà pleine.")
        return

    id_joueur = len(parties[code]["joueurs"])
    parties[code]["joueurs"].append({"pseudo": pseudo, "id": id_joueur})
    join_room(code)

    emit("partie_rejointe", {
        "code": code,
        "idJoueurAttribue": id_joueur
    }, room=request.sid)

    emit("liste_joueurs", [j["pseudo"] for j in parties[code]["joueurs"]], room=code)

# Lorsqu'un joueur est prêt
@socketio.on("pret_a_jouer")
def handle_pret_a_jouer(data):
    code = data.get("code")
    idJoueur = data.get("idJoueur")

    if code not in parties:
        return

    parties[code]["pret"].add(idJoueur)

    if len(parties[code]["pret"]) == len(parties[code]["joueurs"]):
        emit("tous_prets", {
            "nbJoueursServeur": len(parties[code]["joueurs"]),
            "joueurActifServeur": parties[code]["joueur_actif"]
        }, room=code)

        emit("liste_joueurs", [j["pseudo"] for j in parties[code]["joueurs"]], room=code)

# Gestion de la pioche
@socketio.on("demande_pioche")
def handle_pioche(data):
    code = data.get("code")
    idJoueur = data.get("idJoueur")

    if code not in parties:
        return

    deck = parties[code].setdefault("deck", [])

    if len(deck) < 3:
        cartes = deck[:]
        parties[code]["deck"] = []
    else:
        cartes = deck[:3]
        parties[code]["deck"] = deck[3:]

    emit("cartes_piochees", cartes, room=request.sid)

# Lorsqu'une carte est posée par un joueur
@socketio.on("carte_posee")
def handle_carte_posee(data):
    code = data.get("code")

    emit("carte_posee_par_autre", {
        "carteId": data["carteId"],
        "nom": data["nom"],
        "role": data["role"],
        "famille": data["famille"]
    }, room=code, include_self=False)

# Fin de tour
@socketio.on("fin_tour")
def handle_fin_tour(data):
    code = data.get("code")
    if code not in parties:
        return

    nb_joueurs = len(parties[code]["joueurs"])
    parties[code]["joueur_actif"] = (parties[code]["joueur_actif"] + 1) % nb_joueurs

    emit("changer_joueur", {
        "joueurActif": parties[code]["joueur_actif"]
    }, room=code)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
