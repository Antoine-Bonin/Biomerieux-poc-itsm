# ITSM Integration PoC (ServiceNow / SailPoint / Teams)

Micro-service Node.js/TypeScript qui simule l'automatisation d'une demande de
formation entre ServiceNow et le système d'information : vérification de
l'identité côté SailPoint IIQ, décision automatique, notification Teams et
réponse SOAP. Projet personnel réalisé comme preuve de concept ; les systèmes
externes sont simulés (mocks).

## Flux

```
ServiceNow --POST webhook--> PoC --GET--> Mock SailPoint IIQ
                              |
                              +--> Décision (APPROVED / REJECTED)
                              +--> Payload Teams (loggé, non envoyé)
                              +--> Réponse SOAP/XML vers ServiceNow
```

## Endpoints

| Méthode | Route                      | Rôle                                        |
|---------|----------------------------|---------------------------------------------|
| GET     | `/health`                  | Vérification de disponibilité               |
| GET     | `/api/sailpoint/:id`       | Mock SailPoint : statut de l'identité       |
| POST    | `/api/webhook/servicenow`  | Réception d'un ticket, décision, réponse XML |

## Lancement

```bash
WEBHOOK_SECRET=change-me make re
```

L'API est disponible sur http://localhost:3000.

## Exemple

```bash
curl -i -X POST http://localhost:3000/api/webhook/servicenow \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: change-me" \
  -d '{"ticketId":"INC001","employeeId":"USR_789","trainingName":"GMP Basics"}'
```

## Sécurité

- Authentification du webhook par secret partagé (`x-webhook-secret`),
  comparé en temps constant (`crypto.timingSafeEqual`).
- Secret fourni par variable d'environnement, jamais dans le code.
- Validation du payload avec zod (400 si invalide).
- Échappement XML des valeurs injectées dans la réponse SOAP.

## Limites du PoC et évolutions en production

- SailPoint et Teams sont simulés : en production, appels à l'API REST/SCIM
  d'IIQ et à Microsoft Graph, avec authentification OAuth 2.0.
- Côté ServiceNow, l'appel serait déclenché par une Business Rule ou un
  Flow Designer (`RESTMessageV2`).
- Ajouter : tests automatisés (non-régression), idempotence sur `ticketId`,
  retries et timeouts, journalisation structurée.