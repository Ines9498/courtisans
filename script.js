const socket = io();

let codePartie = null;
let pseudo = null;
let idJoueur = null;

// 🔗 Connexion au lobby (juste après chargement du DOM)
document.getElementById("rejoindre-partie").addEventListener("click", () => {
  pseudo = document.getElementById("pseudo").value.trim();
  codePartie = document.getElementById("code-partie").value.trim();
  if (!pseudo || !codePartie) return alert("Remplis ton pseudo et le code partie.");
  socket.emit("rejoindre_partie", { code: codePartie, pseudo });
});

document.getElementById("creer-partie").addEventListener("click", () => {
  pseudo = document.getElementById("pseudo").value.trim();
  if (!pseudo) return alert("Remplis ton pseudo.");
  socket.emit("creer_partie", { pseudo });
});

// 🚀 Réponses du serveur
socket.on("partie_creee", ({ code, idJoueurAttribue }) => {
  codePartie = code;
  idJoueur = idJoueurAttribue;
  document.getElementById("etat-lobby").textContent = `Partie créée avec code ${code}`;
  initialiserInterfaceJeu();
  socket.emit("pret_a_jouer", { code: codePartie, idJoueur });
});

socket.on("partie_rejointe", ({ code, idJoueurAttribue }) => {
  idJoueur = idJoueurAttribue;
  document.getElementById("etat-lobby").textContent = `Rejoint la partie ${code}`;
  initialiserInterfaceJeu();
  socket.emit("pret_a_jouer", { code: codePartie, idJoueur });
});

socket.on("tous_prets", ({ nbJoueursServeur, joueurActifServeur }) => {
  nbJoueurs = nbJoueursServeur;
  joueurActif = joueurActifServeur;
  initialiserScores(nbJoueurs);
  changerDeJoueur();
});

socket.on("liste_joueurs", (joueurs) => {
  joueurs.forEach((joueur, i) => {
    const titre = document.querySelector(`.wrapper-adversaire[data-joueur="${i}"] h4`);
    if (titre) titre.textContent = joueur === pseudo ? "🧍 Toi" : `🎯 ${joueur}`;
  });
});

socket.on("erreur", (message) => {
  alert(message);
});

function initialiserInterfaceJeu() {
  document.getElementById("connexion-lobby").style.display = "none";
  document.getElementById("interface-jeu").style.display = "block";
  console.log("✅ Interface jeu affichée");
}

document.addEventListener("DOMContentLoaded", function () {
  const cartes = [
    // Famille Crapaud
    { nom: "assassin", image: "images/crapaud_assassin.png", count: 2 },
    { nom: "espion", image: "images/crapaud_espion.png", count: 2 },
    { nom: "garde", image: "images/crapaud_bouclier.png", count: 3 },
    { nom: "noble", image: "images/crapaud_noble.png", count: 4 },
    { nom: "sans_role", image: "images/crapaud_normal.png", count: 4 },

    // Famille Carpe
    { nom: "assassin_carpe", image: "images/carpe_assassin.png", count: 2 },
    { nom: "espion_carpe", image: "images/carpe_espion.png", count: 2 },
    { nom: "garde_carpe", image: "images/carpe_bouclier.png", count: 3 },
    { nom: "noble_carpe", image: "images/carpe_noble.png", count: 4 },
    { nom: "sans_role_carpe", image: "images/carpe_normal.png", count: 4 },

    // Famille Papillon
    { nom: "assassin_papillon", image: "images/papillon_assassin.png", count: 2 },
    { nom: "espion_papillon", image: "images/papillon_espion.png", count: 2 },
    { nom: "garde_papillon", image: "images/papillon_bouclier.png", count: 3 },
    { nom: "noble_papillon", image: "images/papillon_noble.png", count: 4 },
    { nom: "sans_role_papillon", image: "images/papillon_normal.png", count: 4 },

    // Famille Cerf
    { nom: "assassin_cerf", image: "images/cerf_assassin.png", count: 2 },
    { nom: "espion_cerf", image: "images/cerf_espion.png", count: 2 },
    { nom: "garde_cerf", image: "images/cerf_bouclier.png", count: 3 },
    { nom: "noble_cerf", image: "images/cerf_noble.png", count: 4 },
    { nom: "sans_role_cerf", image: "images/cerf_normal.png", count: 4 },

    // Famille Lapin
    { nom: "assassin_lapin", image: "images/lapin_assassin.png", count: 2 },
    { nom: "espion_lapin", image: "images/lapin_espion.png", count: 2 },
    { nom: "garde_lapin", image: "images/lapin_bouclier.png", count: 3 },
    { nom: "noble_lapin", image: "images/lapin_noble.png", count: 4 },
    { nom: "sans_role_lapin", image: "images/lapin_normal.png", count: 4 },

    // Famille Rossignol 🪶
    { nom: "assassin_rossignol", image: "images/rossignol_assassin.png", count: 2 },
    { nom: "espion_rossignol", image: "images/rossignol_espion.png", count: 2 },
    { nom: "garde_rossignol", image: "images/rossignol_bouclier.png", count: 3 },
    { nom: "noble_rossignol", image: "images/rossignol_noble.png", count: 4 },
    { nom: "sans_role_rossignol", image: "images/rossignol_normal.png", count: 4 }
  ];

  const dosImage = "images/dos.png";
  const mainContainer = document.getElementById("main-joueur");
  const deckElement = document.getElementById("deck");

  let deck = [];
  let mainDuJoueur = [];
  let carteSelectionnee = null;
  let carteId = 0;
  let placementEffectue = {
    joueur: false,
    adversaire: null,  // vaudra "adversaire-1", "adversaire-2", etc.
    plateau: null      // "lumiere" ou "disgrace"
  };  
  let modeAssassin = false;
  let assassinEnAttente = null;
  let jeuCommence = false;
  let tourActuel = 1;
  let joueurActif = -1; // 0 = toi, 1 = adversaire (ou plus si multijoueur plus tard)
  let nbJoueurs = 2; // valeur par défaut au chargement
  let etatTourInitial = null;

  function terminerPartie() {
    revelerEtReplacerEspions();
    calculerScores(); // recalcul avec espions visibles
    alert("🎉 Partie terminée !");
  }
  
  function revelerEtReplacerEspions() {
    const zonesEspion = document.querySelectorAll(`.sous-zone[data-famille="espion"]`);
  
    zonesEspion.forEach(zone => {
      const cartes = zone.querySelectorAll(".carte");
      cartes.forEach(carte => {
        // Révéler l'espion
        carte.querySelector(".front").style.display = "block";
        carte.querySelector(".back").style.display = "none";
  
        // Trouver sa vraie famille
        const nom = carte.dataset.nom;
        let famille = getFamilleCarte(nom);
        if (!famille || famille === "espion") return;
  
        // Trouver la bonne zone selon le role initial
        const role = zone.dataset.role;
        const zoneFamille = document.querySelector(`.sous-zone[data-role="${role}"][data-famille="${famille}"]`);
        if (zoneFamille) {
          zoneFamille.appendChild(carte.parentElement);
        }
      });
    });
  }
  
  function calculerScores() {
    const scores = new Array(nbJoueurs).fill(0);
    const familles = ["papillon", "crapaud", "rossignol", "lapin", "cerf", "carpe"];
  
    familles.forEach(famille => {
      const nbLumiere = document.querySelectorAll(`.sous-zone[data-role="lumiere"][data-famille="${famille}"] .carte:not([data-nom*="espion"])`).length;
      const nbDisgrace = document.querySelectorAll(`.sous-zone[data-role="disgrace"][data-famille="${famille}"] .carte:not([data-nom*="espion"])`).length;
  
      let multiplicateur = 0;
      if (nbLumiere > nbDisgrace) multiplicateur = 1;
      else if (nbDisgrace > nbLumiere) multiplicateur = -1;
  
      for (let j = 0; j < nbJoueurs; j++) {
        const role = j === 0 ? "joueur" : `adversaire-${j}`;
        const cartes = document.querySelectorAll(`.sous-zone[data-role="${role}"][data-famille="${famille}"] .carte:not([data-nom*="espion"])`);
        cartes.forEach(carte => {
          const nom = carte.dataset.nom;
          if (nom.includes("noble")) {
            scores[j] += 2 * multiplicateur;
          } else {
            scores[j] += 1 * multiplicateur;
          }
        });
        const espions = document.querySelectorAll(`.sous-zone[data-role="${role}"][data-famille="${famille}"] .carte[data-nom*="espion"]`);
        scores[j] += espions.length * multiplicateur;

      }
    });
  
    scores.forEach((score, i) => {
      const span = document.getElementById(`score-${i}`);
      if (span) span.textContent = score;
    });
  }  

  function initialiserScores(nb) {
    const zone = document.getElementById("zone-scores");
    zone.innerHTML = "<h3>Scores</h3>";
  
    for (let i = 0; i < nb; i++) {
      const label = i === 0 ? "🧍 Toi" : `🎯 Adversaire ${i}`;
      const ligne = document.createElement("p");
      ligne.innerHTML = `${label} : <span id="score-${i}">0</span>`;
      zone.appendChild(ligne);
    }
  }
  
  function changerDeJoueur() {
    if (joueurActif === 0) {
      tourActuel++; // ✅ Tour complet terminé
    }
  
    const indicateur = document.getElementById("tour-actuel");
    if (joueurActif === 0) {
      indicateur.textContent = `🧍 Ton tour (Tour ${tourActuel})`;
      indicateur.style.color = "green";
    } else {
      indicateur.textContent = `🎯 Tour de l’adversaire ${joueurActif} (Tour ${tourActuel})`;
      indicateur.style.color = "crimson";
    }

    const boutonValider = document.getElementById("valider-tour");
    const boutonAnnuler = document.getElementById("annuler-tour");
    boutonValider.disabled = true;
    boutonAnnuler.disabled = true;

    const messageTour = document.getElementById("message-tour");
    messageTour.style.display = "block";

    messageTour.textContent = joueurActif === 0
      ? `🧍 À toi de jouer ! (Tour ${tourActuel})`
      : `🎯 Adversaire ${joueurActif} joue...`;

    setTimeout(() => {
      messageTour.style.display = "none";
      boutonValider.disabled = false;
      boutonAnnuler.disabled = false;
    }, 2000);
  
    resetPlacementEffectue();
    updateDeckClickable();
  }  

  function handleZoneClick(e) {
    const zone = e.currentTarget;
    if (!carteSelectionnee) return;
  
    const nom = carteSelectionnee.dataset.nom;

    const estAssassin = nom.includes("assassin");

    // 🗡️ Si c’est un assassin, on déclenche le pouvoir
    if (estAssassin) {
      activerPouvoirAssassin(zone, () => {
        zone.appendChild(carteSelectionnee.parentElement);

        socket.emit("carte_posee", {
          code: codePartie,
          idJoueur,
          carteId: carteSelectionnee.id,
          nom: carteSelectionnee.dataset.nom,
          role: zone.dataset.role,
          famille: zone.dataset.famille
        });

        carteSelectionnee.classList.add("locked");
        carteSelectionnee.classList.remove("selected");

        const index = mainDuJoueur.indexOf(carteSelectionnee.id);
        if (index !== -1) {
          mainDuJoueur.splice(index, 1);
        }

        const roleZone = zone.dataset.role;
        if (roleZone === "joueur") placementEffectue.joueur = true;
        else if (roleZone.startsWith("adversaire")) placementEffectue.adversaire = true;
        else if (roleZone === "lumiere" || roleZone === "disgrace") placementEffectue.plateau = roleZone;

        carteSelectionnee = null;
        if (mainDuJoueur.length === 0) {
          setTimeout(changerDeJoueur, 600); // délai doux pour laisser voir la dernière pose
        }
        
        updateDeckClickable();

        calculerScores();
        
      });
      return; // ⛔ on ne continue pas le reste du handleZoneClick
    }

    // 🔍 Famille
    let familleCarte = "crapaud";
    if (nom.includes("carpe")) familleCarte = "carpe";
    if (nom.includes("papillon")) familleCarte = "papillon";
    if (nom.includes("cerf")) familleCarte = "cerf";
    if (nom.includes("lapin")) familleCarte = "lapin";
    if (nom.includes("rossignol")) familleCarte = "rossignol";
    if (nom.includes("espion")) familleCarte = "espion";
  
    const familleZone = zone.dataset.famille;
    const roleZone = zone.dataset.role;
  
    // Règles
    if (familleCarte === "espion" && familleZone !== "espion") {
      alert("Un espion ne peut être placé que dans une zone espion !");
      return;
    }
  
    if (familleCarte !== "espion" && familleZone !== familleCarte) {
      alert("Cette carte ne peut être placée que dans une zone de sa propre famille !");
      return;
    }
  
    if (!modeAssassin && (
      (roleZone === "joueur" && placementEffectue.joueur) ||
      (roleZone.startsWith("adversaire") && placementEffectue.adversaire) ||
      ((roleZone === "lumiere" || roleZone === "disgrace") && placementEffectue.plateau && placementEffectue.plateau !== roleZone)
    )) {
      alert("Tu as déjà placé une carte dans cette zone ce tour-ci !");
      return;
    }
  
    if (familleCarte === "espion") {
      carteSelectionnee.querySelector(".front").style.display = "none";
      carteSelectionnee.querySelector(".back").style.display = "block";
    }
  
    zone.appendChild(carteSelectionnee.parentElement);
    carteSelectionnee.classList.add("locked");
    carteSelectionnee.classList.remove("selected");

    socket.emit("carte_posee", {
      code: codePartie,
      idJoueur,
      carteId: carteSelectionnee.id,
      nom: carteSelectionnee.dataset.nom,
      role: zone.dataset.role,
      famille: zone.dataset.famille
    });
  
    const index = mainDuJoueur.indexOf(carteSelectionnee.id);
    if (index !== -1) {
      mainDuJoueur.splice(index, 1);
    }
  
    if (roleZone === "joueur") placementEffectue.joueur = true;
    else if (roleZone.startsWith("adversaire")) placementEffectue.adversaire = true;
    else if (roleZone === "lumiere" || roleZone === "disgrace") placementEffectue.plateau = roleZone;
  
    carteSelectionnee = null;
    updateDeckClickable();
  }
  
  function resetPlacementEffectue() {
    placementEffectue = {
      joueur: false,
      adversaire: false,
      plateau: null
    };
  }  

  function demanderActivationAssassin(callbackOui, callbackNon) {
    const modal = document.getElementById("assassin-modal");
    const btnOui = document.getElementById("btn-assassin-oui");
    const btnNon = document.getElementById("btn-assassin-non");
  
    modal.style.display = "block";
  
    const close = () => {
      modal.style.display = "none";
      btnOui.removeEventListener("click", onOui);
      btnNon.removeEventListener("click", onNon);
    };
  
    const onOui = () => {
      close();
      callbackOui();
    };
  
    const onNon = () => {
      close();
      callbackNon();
    };
  
    btnOui.addEventListener("click", onOui);
    btnNon.addEventListener("click", onNon);
  }  

  function getFamilleCarte(nom) {
    if (nom.includes("carpe")) return "carpe";
    if (nom.includes("papillon")) return "papillon";
    if (nom.includes("cerf")) return "cerf";
    if (nom.includes("lapin")) return "lapin";
    if (nom.includes("rossignol")) return "rossignol";
    return "crapaud"; // défaut
  }
  
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }  

  function creerDomaineAdversaire(numero, position = "haut") {
  const familles = ["papillon", "crapaud", "rossignol", "espion", "lapin", "cerf", "carpe"];

  const wrapper = document.createElement("div");
  wrapper.className = `wrapper-adversaire position-${position}`;
  wrapper.dataset.joueur = numero; // ✅ important pour l'affichage des pseudos

  const titre = document.createElement("h4");
  titre.textContent = `Adversaire ${numero}`;

  const conteneur = document.createElement("div");
  conteneur.className = "ligne-zones";
  conteneur.dataset.joueur = numero;

  familles.forEach(famille => {
    const zone = document.createElement("div");
    zone.className = "sous-zone";
    zone.dataset.famille = famille;
    zone.dataset.role = `adversaire-${numero}`;
    zone.textContent = `🧿 ${capitalize(famille)}${famille === "espion" ? " 🎭" : ""}`;
    zone.addEventListener("click", handleZoneClick);
    conteneur.appendChild(zone);
  });

  wrapper.appendChild(titre);
  wrapper.appendChild(conteneur);
  document.getElementById("domaine-adversaires").appendChild(wrapper);
}
  
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }  

  cartes.forEach(carte => {
    for (let i = 0; i < carte.count; i++) {
      deck.push({ id: `carte-${carteId++}`, nom: carte.nom, image: carte.image });
    }
  });
  
  // Sélection du nombre de joueurs et retrait de cartes
  const selectJoueurs = document.getElementById("nb-joueurs");
  const boutonValider = document.getElementById("valider-joueurs");

  boutonValider.addEventListener("click", () => {
    nbJoueurs = parseInt(selectJoueurs.value);

    // Nombre de cartes à retirer
    const cartesARetirer = {
      2: 30,
      3: 18,
      4: 6,
      5: 0
    };

    const nbRetrait = cartesARetirer[nbJoueurs];
    shuffle(deck);

    // Retire aléatoirement les cartes
    for (let i = 0; i < nbRetrait; i++) deck.pop();

    alert(`🎮 Configuration pour ${nbJoueurs} joueurs activée ! ${nbRetrait} cartes retirées du deck.`);

    jeuCommence = true;

    // Positionner les adversaires autour du plateau selon le nombre de joueurs
    if (nbJoueurs === 2) {
      creerDomaineAdversaire(1, "haut");
    } else if (nbJoueurs === 3) {
      creerDomaineAdversaire(1, "haut");
      creerDomaineAdversaire(2, "gauche");
    } else if (nbJoueurs === 4) {
      creerDomaineAdversaire(1, "haut");
      creerDomaineAdversaire(2, "gauche");
      creerDomaineAdversaire(3, "droite");
    } else if (nbJoueurs === 5) {
      creerDomaineAdversaire(1, "haut-gauche");
      creerDomaineAdversaire(2, "gauche");
      creerDomaineAdversaire(3, "droite");
      creerDomaineAdversaire(4, "haut-droite");
    }

    boutonValider.disabled = true;
    selectJoueurs.disabled = true;
    document.querySelector(".select-joueurs").style.display = "none";
    
    updateDeckClickable();
    initialiserScores(nbJoueurs);
    
    const zoneScore = document.getElementById("zone-scores");
    zoneScore.classList.add("scoreboard");
    zoneScore.style.position = "fixed";
    zoneScore.style.top = "20px";
    zoneScore.style.right = "20px";

    joueurActif = - 1;
    tourActuel = 0;

  });

  window.piocherCartes = function () {
    if (!jeuCommence || mainDuJoueur.length > 0 || deck.length === 0) return;
    if (joueurActif !== 0) {
      alert("Ce n’est pas à toi de piocher !");
      return;
    }
    socket.emit("demande_pioche", { code: codePartie, idJoueur });
  };

  function updateDeckClickable() {
    deckElement.style.opacity = (mainDuJoueur.length === 0 && deck.length > 0) ? "1" : "0.5";
  }

  function createCarteElement(data) {
    const container = document.createElement("div");
    container.className = "carte-container";

    const card = document.createElement("div");
    card.className = "carte";
    card.id = data.id;
    card.dataset.nom = data.nom;

    const front = document.createElement("div");
    front.className = "carte-face front";
    const imgFront = document.createElement("img");
    imgFront.src = data.image;
    front.appendChild(imgFront);

    const back = document.createElement("div");
    back.className = "carte-face back";
    const imgBack = document.createElement("img");
    imgBack.src = dosImage;
    back.appendChild(imgBack);

    card.appendChild(front);
    card.appendChild(back);
    container.appendChild(card);

    front.style.display = "block";
    back.style.display = "none";

    card.addEventListener("click", () => {
      if (card.classList.contains("locked")) return;
      if (carteSelectionnee) carteSelectionnee.classList.remove("selected");
      carteSelectionnee = card;
      card.classList.add("selected");
    });

    return container;
  }

  document.querySelectorAll(".sous-zone").forEach(zone => {
    if (!zone.dataset.famille || !zone.dataset.role) return;
    zone.addEventListener("click", handleZoneClick);
  });

  deckElement.addEventListener("click", () => {
    piocherCartes();
  });

  updateDeckClickable();

  function activerPouvoirAssassin(zoneCliquee, callbackPlacementFinal) {
    const roleZone = zoneCliquee.dataset.role;

    if ((roleZone === "joueur" && placementEffectue.joueur) ||
        (roleZone === "adversaire" && placementEffectue.adversaire) ||
        ((roleZone === "lumiere" || roleZone === "disgrace") && placementEffectue.plateau)) {
      alert("Tu as déjà placé une carte dans cette zone ce tour-ci !");
      return;
    }

    modeAssassin = true;

    demanderActivationAssassin(
      () => {
        // ✅ Le joueur a choisi d'utiliser le pouvoir
        lancerEffetAssassin(zoneCliquee);
      },
      () => {
        // ❌ Le joueur a choisi de ne pas utiliser le pouvoir, on pose la carte normalement
        const familleAssassin = getFamilleCarte(carteSelectionnee.dataset.nom);
        const role = zoneCliquee.dataset.role;
        const zoneNormale = document.querySelector(`.sous-zone[data-famille="${familleAssassin}"][data-role="${role}"]`);

        if (zoneNormale) {
          zoneNormale.appendChild(carteSelectionnee.parentElement);
          carteSelectionnee.classList.add("locked");
          carteSelectionnee.classList.remove("selected");

          const index = mainDuJoueur.indexOf(carteSelectionnee.id);
          if (index !== -1) {
            mainDuJoueur.splice(index, 1);
          }

          if (role === "joueur") placementEffectue.joueur = true;
          else if (role === "adversaire") placementEffectue.adversaire = true;
          else if (role === "lumiere" || role === "disgrace") placementEffectue.plateau = true;

          carteSelectionnee = null;
          updateDeckClickable();
        } else {
          alert("Erreur : zone de placement introuvable pour l’assassin.");
        }

        modeAssassin = false;
        calculerScores();
      }
    );
  }

  function lancerEffetAssassin(zoneCliquee) {
    const visualZone = document.getElementById("visual-zone");
    visualZone.innerHTML = "";
    visualZone.style.display = "flex";

    const cartesTrouvées = [];
    zoneCliquee.querySelectorAll(".carte").forEach(carte => {
      cartesTrouvées.push({ carte, parent: carte.parentElement });
    });

    if (cartesTrouvées.length === 0) {
      alert("Aucune carte à cet endroit.");
      visualZone.style.display = "none";
      return;
    }

    cartesTrouvées.forEach(({ carte }) => {
      const clone = carte.cloneNode(true);
      clone.classList.remove("locked", "selected");
      clone.querySelector(".front").style.display = "block";
      clone.querySelector(".back").style.display = "none";

      const wrapper = document.createElement("div");
      wrapper.className = "carte-container";
      wrapper.appendChild(clone);

      wrapper.addEventListener("click", () => {
        if (carte.dataset.nom.includes("garde")) {
          alert("Impossible de tuer un Garde !");
          return;
        }

        const defausse = document.getElementById("zone-defausse");
        defausse.prepend(carte.parentElement); // 🔁 met la carte en haut de la pile

        const familleAssassin = getFamilleCarte(carteSelectionnee.dataset.nom);
        const roleVictime = zoneCliquee.dataset.role;
        const cible = document.querySelector(`.sous-zone[data-famille="${familleAssassin}"][data-role="${roleVictime}"]`);

        visualZone.innerHTML = "";
        visualZone.style.display = "none";

        const index = mainDuJoueur.indexOf(carteSelectionnee.id);
        if (index !== -1) {
          mainDuJoueur.splice(index, 1);
        }

        if (cible) {
          cible.appendChild(carteSelectionnee.parentElement);
          carteSelectionnee.classList.add("locked");
          carteSelectionnee.classList.remove("selected");

          if (roleVictime === "joueur") placementEffectue.joueur = true;
          else if (roleVictime === "adversaire") placementEffectue.adversaire = true;
          else if (roleVictime === "lumiere" || roleVictime === "disgrace") placementEffectue.plateau = true;

          carteSelectionnee = null;
          updateDeckClickable();
        } else {
          alert("Erreur : zone cible introuvable pour l’assassin.");
        }

        modeAssassin = false;
        calculerScores();
      });

      visualZone.appendChild(wrapper);
    });

    // ➕ Bouton "Annuler"
    const btnAnnuler = document.createElement("button");
    btnAnnuler.textContent = "Annuler";
    btnAnnuler.className = "btn-annuler-assassinat";
    btnAnnuler.style.marginTop = "1rem";
    btnAnnuler.style.padding = "0.5rem 1rem";
    btnAnnuler.style.fontSize = "1rem";

    btnAnnuler.addEventListener("click", () => {
      visualZone.innerHTML = "";
      visualZone.style.display = "none";
      if (carteSelectionnee) {
        carteSelectionnee.classList.add("selected"); // 🔁 remettre en évidence la carte sélectionnée
      }
      modeAssassin = true; // 🟢 rester en mode assassin
    });

    visualZone.appendChild(btnAnnuler);

  }

  document.getElementById("valider-tour").addEventListener("click", () => {
  if (mainDuJoueur.length > 0) {
    alert("Tu dois poser toutes tes cartes avant de valider le tour !");
    return;
  }

  etatTourInitial = null; // une fois validé, on ne peut plus annuler

  socket.emit("fin_tour", { code: codePartie, idJoueur });

  });

  document.getElementById("annuler-tour").addEventListener("click", () => {
  if (!etatTourInitial) {
    alert("Aucun tour à annuler !");
    return;
  }

  // Restaurer la main du joueur
  document.getElementById("main-joueur").innerHTML = etatTourInitial.mainHTML;

  // Restaurer les zones
  etatTourInitial.zonesHTML.forEach(({ famille, role, html }) => {
    const zone = document.querySelector(`.sous-zone[data-famille="${famille}"][data-role="${role}"]`);
    if (zone) zone.innerHTML = html;
  });

  // Réinitialiser la sélection et les événements
  mainDuJoueur = [];
  document.querySelectorAll("#main-joueur .carte").forEach(carte => {
    mainDuJoueur.push(carte.id);
    carte.addEventListener("click", () => {
      if (carte.classList.contains("locked")) return;
      if (carteSelectionnee) carteSelectionnee.classList.remove("selected");
      carteSelectionnee = carte;
      carte.classList.add("selected");
    });
  });

  document.querySelectorAll(".sous-zone").forEach(zone => {
    zone.addEventListener("click", handleZoneClick);
  });

  resetPlacementEffectue();
  updateDeckClickable();
  // ❗ etatTourInitial NON réinitialisé ici pour pouvoir recommencer plusieurs fois
  });  
  
  socket.on("cartes_piochees", (cartes) => {
    document.getElementById("main-joueur").innerHTML = "";
    mainDuJoueur = [];
    cartes.forEach(carteData => {
      mainDuJoueur.push(carteData.id);
      const container = createCarteElement(carteData);
      mainContainer.appendChild(container);
    });
    updateDeckClickable();
  });

  socket.on("carte_posee_par_autre", ({ carteId, nom, role, famille }) => {
    const zone = document.querySelector(`.sous-zone[data-role="${role}"][data-famille="${famille}"]`);
    if (!zone) return;
    const image = `images/${nom}.png`;
    const carte = createCarteElement({ id: carteId, nom: nom, image });
    carte.querySelector(".carte").classList.add("locked");
    zone.appendChild(carte);
  });

  socket.on("changer_joueur", ({ joueurActif: nouveauJoueur }) => {
    joueurActif = nouveauJoueur;
    changerDeJoueur();
  });

});
