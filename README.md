# ITSM Integration PoC (ServiceNow / SailPoint / Teams)

Ce projet est un micro-service (Proof of Concept) en Node.js/TypeScript. Il simule l'orchestration et l'automatisation de processus entre ServiceNow et le système d'information de l'entreprise.

## Fonctionnalités
- **Webhook ServiceNow** : Écoute et réception des demandes de formation.
- **Mock API REST (SailPoint)** : Vérification des droits et du statut de l'employé.
- **Notification Microsoft Teams** : Formatage de la décision en MessageCard.
- **Protocole SOAP** : Renvoi de la décision au format XML (Envelope).

## Lancement rapide (via Docker)
```bash
make re