# ITSM Integration PoC (ServiceNow / SailPoint / Teams)

Ce projet est un micro-service (Proof of Concept) en Node.js/TypeScript. Il simule l'orchestration et l'automatisation de processus entre ServiceNow et le système d'information de l'entreprise (Identity Governance).

## Fonctionnalités & Architecture
- **Webhook ServiceNow** : Écoute et réception des demandes de formation, validées strictement via `zod`.
- **Logique Métier Partagée** : Vérification des droits (compte actif, formations prérequises validées) via un mock SailPoint sécurisé par une structure `Map` (protection contre l'injection de prototype).
- **Notification Microsoft Teams** : Formatage de la décision en MessageCard JSON, prêt pour la Graph API.
- **Protocole de réponse** : Les erreurs techniques renvoient du JSON (400/401/500), tandis que les décisions "métier" renvoient systématiquement du SOAP (XML) pour s'interfacer avec les systèmes historiques.

## Lancement rapide

```bash
# Configurer les variables d'environnement
cp .env.example .env
# Ajouter votre WEBHOOK_SECRET dans .env

# Lancer via Docker
make re
```

## Tests et Cas d'Usage (via cURL)

Une fois le conteneur Docker lancé (sur le port 3000), vous pouvez tester les différents mécanismes de sécurité et de validation du serveur :

**1. Scénario nominal (Succès complet)**
Le secret est bon, le payload est valide, l'employé remplit les critères métier. 
*Résultat attendu : Le serveur renvoie une réponse SOAP (XML) d'approbation et notifie Teams.*
```bash
curl -X POST http://localhost:3000/api/webhook/servicenow \
  -H "x-webhook-secret: biomerieux-poc-secret-2026" \
  -H "Content-Type: application/json" \
  -d '{"ticketId": "INC001", "employeeId": "USR_123", "trainingName": "Formation_Securite_Cornerstone"}'
```

**2. Échec de Sécurité (Mauvaise clé HMAC)**
Test de la protection du webhook contre les accès non autorisés (simulation d'une attaque).
*Résultat attendu : Rejet immédiat avec une erreur HTTP 401 (JSON).*
```bash
curl -X POST http://localhost:3000/api/webhook/servicenow \
  -H "x-webhook-secret: BAD" \
  -H "Content-Type: application/json" \
  -d '{"ticketId": "INC002", "employeeId": "USR_123", "trainingName": "Formation_Securite_Cornerstone"}'
```

**3. Échec de Validation de Schéma (Zod)**
Omission volontaire d'un champ obligatoire (`trainingName`).
*Résultat attendu : Rejet avant l'exécution métier. Erreur HTTP 400 (JSON) détaillant le champ manquant.*
```bash
curl -X POST http://localhost:3000/api/webhook/servicenow \
  -H "x-webhook-secret: biomerieux-poc-secret-2026" \
  -H "Content-Type: application/json" \
  -d '{"ticketId": "INC003", "employeeId": "USR_123"}'
```

**4. Refus Métier (Droits insuffisants)**
La requête est techniquement parfaite, mais l'employé n'existe pas ou n'a pas les prérequis dans la base (SailPoint/Cornerstone).
*Résultat attendu : Le serveur renvoie une réponse SOAP (XML) de refus pour clôturer le ticket ServiceNow.*
```bash
curl -X POST http://localhost:3000/api/webhook/servicenow \
  -H "x-webhook-secret: biomerieux-poc-secret-2026" \
  -H "Content-Type: application/json" \
  -d '{"ticketId": "INC004", "employeeId": "USR_999", "trainingName": "Formation_Securite_Cornerstone"}'
```

**5. Robustesse au Format (Mauvais Content-Type)**
Envoi de données brutes au lieu d'un JSON formaté.
*Résultat attendu : Rejet propre sans crash du serveur Node.js Erreur 400.*
```bash
curl -X POST http://localhost:3000/api/webhook/servicenow \
  -H "x-webhook-secret: biomerieux-poc-secret-2026" \
  -H "Content-Type: text/plain" \
  -d '{"Ceci_n_est": "pas_un_json_valide"}'
```

## Limites du PoC et évolutions (Cible de Production)
Dans un environnement de production réel (comme chez bioMérieux), ce PoC Node.js a vocation à disparaître pour être intégré nativement. 
- **Migration vers ServiceNow** : La logique JavaScript serait portée dans une *Business Rule* ou un *Script Include*, et interrogerait SailPoint via un *REST Message V2*.
- **Authentification** : Remplacement du HMAC par un OAuth2 flow complet avec Azure AD pour l'envoi vers Microsoft Graph.
