
## Tests et Cas d'Usage (via cURL)

Une fois le conteneur Docker lancé (sur le port 3000), vous pouvez tester les différents mécanismes de sécurité et de validation du serveur :

**1. Scénario normal (Succès complet)**
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