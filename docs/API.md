# FlowBooks API Reference

Base URL: `http://localhost:3001/api/v1` (development)

**Interactive docs:** http://localhost:3001/api/docs (Swagger UI)

## Authentication

All protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

Tenant-scoped endpoints also require:
```
x-organization-id: <organization_id>
```

---

## Auth

### POST /auth/register
Register a new user.

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:** `{ user, token }`

### POST /auth/login
Login with credentials.

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:** `{ user, token }`

### GET /auth/me
Get current user profile with organization memberships.

**Headers:** `Authorization: Bearer <token>`

---

## Organizations

### POST /organizations
Create a new organization (user becomes OWNER).

```json
{
  "name": "Acme Inc",
  "slug": "acme-inc",
  "currency": "USD",
  "timezone": "America/New_York"
}
```

### GET /organizations
List organizations for current user.

### GET /organizations/:id
Get organization details with members.

---

## Customers

All endpoints require `x-organization-id` header.

### GET /customers
List customers (paginated).

Query params: `page`, `limit`

### GET /customers/:id
Get customer by ID.

### POST /customers
Create customer.

```json
{
  "name": "Acme Corp",
  "email": "billing@acme.com",
  "phone": "+1-555-0100",
  "address": {
    "line1": "123 Main St",
    "city": "New York",
    "country": "US"
  },
  "taxId": "12-3456789"
}
```

### PATCH /customers/:id
Update customer (partial).

### DELETE /customers/:id
Soft-delete customer (sets `isActive: false`).

---

## Products

### GET /products
List products (paginated).

### GET /products/:id
Get product by ID.

### POST /products
Create product.

```json
{
  "name": "Consulting Hour",
  "description": "Professional consulting services",
  "sku": "CONS-001",
  "unitPrice": 150.00,
  "currency": "USD",
  "taxRate": 0.1
}
```

### PATCH /products/:id
Update product.

### DELETE /products/:id
Soft-delete product.

---

## Invoices

### GET /invoices
List invoices with customer and items.

### GET /invoices/:id
Get invoice with full details.

### POST /invoices
Create invoice with line items.

```json
{
  "customerId": "clx...",
  "dueDate": "2026-02-01T00:00:00Z",
  "currency": "USD",
  "notes": "Payment due within 30 days",
  "discount": 0,
  "items": [
    {
      "productId": "clx...",
      "description": "Consulting - January",
      "quantity": 10,
      "unitPrice": 150.00,
      "taxRate": 0.1
    }
  ]
}
```

Invoice numbers auto-increment per organization (e.g., `INV-00001`).

### PATCH /invoices/:id
Update invoice status, due date, notes.

---

## Dashboard

### GET /dashboard/metrics
Get dashboard metrics for organization.

**Response:**
```json
{
  "revenue": 15000.00,
  "expenses": 0,
  "outstanding": 5000.00,
  "cashFlow": 15000.00,
  "currency": "USD",
  "period": "month",
  "counts": {
    "customers": 12,
    "products": 8
  }
}
```

---

## Health

### GET /health
Health check endpoint (no auth required).

**Response:** `{ status: "ok", info: { database: { status: "up" } } }`

---

## Error Responses

```json
{
  "statusCode": 400,
  "message": ["email must be an email"],
  "error": "Bad Request"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Validation error |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (not org member) |
| 404 | Resource not found |
| 409 | Conflict (duplicate email/slug) |

---

## Rate Limiting

Not yet implemented. Planned for Phase 6.

## Webhooks

Not yet implemented. Planned for Phase 6.

## GraphQL

Not yet implemented. API structure is GraphQL-ready. Planned for Phase 6.
