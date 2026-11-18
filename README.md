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

## Limites du PoC et évolutions (Cible de Production)
Dans un environnement de production réel (comme chez bioMérieux), ce PoC Node.js a vocation à disparaître pour être intégré nativement. 
- **Migration vers ServiceNow** : La logique JavaScript serait portée dans une *Business Rule* ou un *Script Include*, et interrogerait SailPoint via un *REST Message V2*.
- **Authentification** : Remplacement du HMAC par un OAuth2 flow complet avec Azure AD pour l'envoi vers Microsoft Graph.
