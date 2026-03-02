# Identity-Reconciliation

A production-ready backend service that performs graph-based identity resolution across multiple purchases using email and phone number linkage.

Base Url: https://identity-reconciliation-epws.onrender.com/

Identify Endpoint: POST /identify

Example: POST https://identity-reconciliation-epws.onrender.com/identify

## Request Format:
```
{
  "email": "string (optional)",
  "phoneNumber": "string (optional)"
}
```

-At least one of email or phone number must be provided.
-Content type must be `Application/json`
-`form-data` is not supported.

## Response Format:
```
{
  "contact": {
    "primaryContactId": number,
    "emails": string[],
    "phoneNumbers": string[],
    "secondaryContactIds": number[]
  }
}
```
## Tech Stack Used:
-Node.js
-TypeScript
-Express
-PostgreSQL
-Prisma ORM
-Render

## Author:
Soham Shah