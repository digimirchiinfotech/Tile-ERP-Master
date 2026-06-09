# Controllers Logic & Implementation Guide

**Version:** 4.1.0  
**Last Updated:** June 2026

---

## Controller Architecture

Every controller in `backend/src/controllers/` follows this standard CRUD pattern:

```javascript
export const getAll = async (req, res, next) => {}; // List with pagination
export const getById = async (req, res, next) => {}; // Get single record
export const create = async (req, res, next) => {}; // Create record
export const update = async (req, res, next) => {}; // Update record
export const remove = async (req, res, next) => {}; // Soft delete
export const hardDelete = async (req, res, next) => {}; // Permanent delete (admin only)
```

All controllers:

- Use `try/catch` and pass errors to the central error handler via `next(error)`
- MUST filter all queries by `req.companyFilter` (derived mathematically from the JWT context middleware) rather than just user-scoped queries. This heavily fortifies Multi-Tenant bounds.
- Return the standard response envelope: `{ success: true, data: ... }`

### Document Number Generators

Rather than utilizing date-resetting formatting mechanisms (`e.g., reset counter per month/year`), the systems invoke:
`generateDocumentNumber(companyId, 'PREFIX', 'ALL_TIME')`
Assigning `ALL_TIME` permanently establishes an incremental rolling numbering block (`PREFIX/0001, PREFIX/0002`) universally attached to the tenant regardless of standard resets.

---

## Authentication Controller

### Login Logic

```javascript
export const login = async (req, res, next) => {
  try {
    const { email_id, password } = req.body;

    if (!email_id || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    // Find user
    const userResult = await query(
      "SELECT * FROM users WHERE email_id = $1 AND deleted_at IS NULL",
      [email_id],
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = userResult.rows[0];

    // Check account lockout
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({ error: "Account temporarily locked" });
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      // Increment failed attempts
      await query(
        "UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = $1",
        [user.id],
      );
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check user and company status
    if (user.status !== "active") {
      return res.status(403).json({ error: "Account inactive" });
    }

    // Generate tokens — access: 7d, refresh: 30d
    const accessToken = jwt.sign(
      {
        userId: user.id,
        companyId: user.company_id,
        role: user.role,
        email: user.email_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRY || "7d" },
    );

    const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRY || "30d",
    });

    // Reset failed login counter
    await query(
      "UPDATE users SET failed_login_attempts = 0, last_login = NOW() WHERE id = $1",
      [user.id],
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email_id: user.email_id,
          role: user.role,
          company_id: user.company_id,
        },
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_ACCESS_EXPIRY || "7d",
      },
    });
  } catch (error) {
    next(error);
  }
};
```

---

## Client Controller

### Get All Clients (with Pagination and Search)

```javascript
export const getClients = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { page = 1, limit = 10, search = "" } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = "WHERE company_id = $1 AND deleted_at IS NULL";
    let params = [companyId];
    let paramIndex = 2;

    if (search) {
      whereClause += ` AND (client_name ILIKE $${paramIndex} OR client_email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM clients ${whereClause}`,
      params,
    );

    const dataResult = await query(
      `SELECT * FROM clients ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset],
    );

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
      },
    });
  } catch (error) {
    next(error);
  }
};
```

### Create Client

```javascript
export const createClient = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { error, value } = validateClientData(req.body);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Check for duplicate email within the same company
    const duplicateResult = await query(
      "SELECT id FROM clients WHERE company_id = $1 AND client_email = $2 AND deleted_at IS NULL",
      [companyId, value.client_email],
    );

    if (duplicateResult.rows.length > 0) {
      return res
        .status(409)
        .json({ error: "A client with this email already exists" });
    }

    const result = await query(
      `INSERT INTO clients (
        company_id, client_name, client_email, client_phone,
        client_address, city, country, credit_limit, credit_days
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        companyId,
        value.client_name,
        value.client_email,
        value.client_phone,
        value.client_address,
        value.city,
        value.country,
        value.credit_limit,
        value.credit_days,
      ],
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};
```

### Update Client (Dynamic Field Update)

```javascript
export const updateClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    // Confirm the record belongs to this company
    const checkResult = await query(
      "SELECT id FROM clients WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL",
      [id, companyId],
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Build dynamic UPDATE — only include fields that were sent
    const updateFields = [
      "client_name",
      "client_email",
      "client_phone",
      "client_address",
      "city",
      "country",
      "credit_limit",
      "credit_days",
    ];

    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const field of updateFields) {
      if (req.body[field] !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        values.push(req.body[field]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return res.json({ success: true, message: "No fields to update" });
    }

    fields.push(`updated_at = NOW()`);
    values.push(id, companyId);

    const result = await query(
      `UPDATE clients
       SET ${fields.join(", ")}
       WHERE id = $${paramIndex} AND company_id = $${paramIndex + 1}
       RETURNING *`,
      values,
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};
```

### Soft Delete Client

```javascript
export const deleteClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    const result = await query(
      `UPDATE clients
       SET deleted_at = NOW()
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [id, companyId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }

    res.json({ success: true, message: "Client deleted successfully" });
  } catch (error) {
    next(error);
  }
};
```

---

## Proforma/Export Invoice Controllers (Transactional Integrity)

### Relational Database Shift & Dual-Persistence Strategy

Previously, product line items were stored as non-relational `JSONB` arrays (`product_lines` column) which prevented strict foreign-key dependencies (e.g. `ON DELETE RESTRICT` for products). We have migrated to a normalized junction table architecture.

Currently, our core controllers (`proformaInvoiceController.js`, `proformaOrderController.js`, `exportInvoiceController.js`) employ a **dual-persistence strategy** grouped inside atomic PostgreSQL transactions.

1. They accept the conventional JSON array payload from the frontend.
2. They stringify and store the `product_lines` JSONB data for legacy frontend backward compatibility.
3. They **simultaneously** extract the line items and explicitly `INSERT` them into their respective junction tables (`proforma_invoice_lines`, `export_invoice_lines`) to establish hard SQL `FOREIGN KEY` references before `COMMIT`.

### Example: Create Invoice with Relational Line Items (Transaction)

Multi-step operations **must** use PostgreSQL transactions to ensure atomicity:

```javascript
export const createProformaInvoice = async (req, res, next) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { companyId } = req.user;
    const {
      client_id,
      product_lines = [],
      shipping_terms,
      sgst_rate,
      cgst_rate,
      other_charges,
    } = req.body;

    if (!product_lines || product_lines.length === 0) {
      return res.status(400).json({ error: "At least one item is required" });
    }

    // Generate sequential invoice number (Using ALL_TIME overrides)
    const invoiceNum = await generateDocumentNumber(
      companyId,
      "proforma_invoice",
      "ALL_TIME",
    );

    // Calculate totals
    const subtotal = product_lines.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0,
    );
    const sgstAmount = (subtotal * (sgst_rate || 0)) / 100;
    const cgstAmount = (subtotal * (cgst_rate || 0)) / 100;
    const fobTotal = subtotal + sgstAmount + cgstAmount + (other_charges || 0);

    // Insert invoice header (Includes legacy product_lines JSON string for frontend backward compatibility)
    const invoiceResult = await client.query(
      `INSERT INTO proforma_invoices (
        company_id, client_id, invoice_number, subtotal,
        sgst_rate, sgst_amount, cgst_rate, cgst_amount,
        fob_total, shipping_terms, product_lines, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Draft')
      RETURNING *`,
      [
        companyId,
        client_id,
        invoiceNum,
        subtotal,
        sgst_rate,
        sgstAmount,
        cgst_rate,
        cgstAmount,
        fobTotal,
        shipping_terms,
        JSON.stringify(product_lines),
      ],
    );

    const invoiceId = invoiceResult.rows[0].id;

    // Strict Relational Junction Table Population
    // This allows the productController to count references and block deletion
    for (const item of product_lines) {
      await client.query(
        `INSERT INTO proforma_invoice_lines (invoice_id, product_id, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          invoiceId,
          item.product_id,
          item.quantity,
          item.unit_price,
          item.quantity * item.unit_price,
        ],
      );
    }

    await client.query("COMMIT");

    res.status(201).json({ success: true, data: invoiceResult.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
};
```

---

## VGM Controller

```javascript
export const createVGM = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const {
      export_invoice_id,
      container_no,
      gross_mass,
      weighing_method,
      verified_by,
      verification_date,
    } = req.body;

    const result = await query(
      `INSERT INTO vgm_documents
       (company_id, export_invoice_id, container_no, gross_mass, weighing_method, verified_by, verification_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        companyId,
        export_invoice_id,
        container_no,
        gross_mass,
        weighing_method,
        verified_by,
        verification_date,
      ],
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};
```

---

## Global Search Controller

```javascript
export const globalSearch = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res
        .status(400)
        .json({ error: "Search query must be at least 2 characters" });
    }

    const searchTerm = `%${q}%`;
    const results = {};

    // Search clients
    results.clients = (
      await query(
        `SELECT id, client_name AS title, client_email AS description, 'client' AS type
       FROM clients
       WHERE company_id = $1 AND client_name ILIKE $2 AND deleted_at IS NULL
       LIMIT 10`,
        [companyId, searchTerm],
      )
    ).rows;

    // Search products
    results.products = (
      await query(
        `SELECT id, product_name AS title, sku AS description, 'product' AS type
       FROM products
       WHERE company_id = $1 AND product_name ILIKE $2 AND deleted_at IS NULL
       LIMIT 10`,
        [companyId, searchTerm],
      )
    ).rows;

    // Search proforma invoices
    results.invoices = (
      await query(
        `SELECT id, invoice_number AS title, status AS description, 'invoice' AS type
       FROM proforma_invoices
       WHERE company_id = $1 AND invoice_number ILIKE $2 AND deleted_at IS NULL
       LIMIT 10`,
        [companyId, searchTerm],
      )
    ).rows;

    // Search leads
    results.leads = (
      await query(
        `SELECT id, client_name AS title, country AS description, 'lead' AS type
       FROM leads
       WHERE company_id = $1 AND client_name ILIKE $2 AND deleted_at IS NULL
       LIMIT 10`,
        [companyId, searchTerm],
      )
    ).rows;

    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};
```

---

## System Settings Controller

```javascript
export const getSystemSettings = async (req, res, next) => {
  try {
    const { companyId } = req.user;

    const result = await query(
      "SELECT * FROM system_settings WHERE company_id = $1",
      [companyId],
    );

    const settings = result.rows[0] || {};

    res.json({
      success: true,
      data: {
        general: {
          site_name: settings.site_name,
          timezone: settings.timezone,
          date_format: settings.date_format,
          currency: settings.currency,
        },
        email: {
          smtp_host: settings.smtp_host,
          smtp_port: settings.smtp_port,
          smtp_user: settings.smtp_user,
        },
        security: {
          session_timeout: settings.session_timeout,
          max_login_attempts: settings.max_login_attempts,
        },
        notification: {
          email_enabled: settings.email_enabled,
          push_enabled: settings.push_enabled,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
```

---

## Export Invoice Annexure Controller

```javascript
export const getAnnexure = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    const result = await query(
      `SELECT * FROM export_invoice_annexures
       WHERE export_invoice_id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Annexure not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};
```

---

## Error Handling

All controllers delegate error handling to the central `errorHandler` middleware:

```javascript
try {
  // Business logic
} catch (error) {
  next(error); // Passes to middleware/errorHandler.js
}
```

The central error handler converts PostgreSQL error codes to meaningful HTTP responses:

| PG Error Code                   | HTTP Response                       |
| ------------------------------- | ----------------------------------- |
| `23505` — unique violation      | 409 Conflict — Duplicate entry      |
| `23503` — foreign key violation | 400 Bad Request — Invalid reference |
| `22P02` — invalid UUID          | 400 Bad Request — Invalid ID format |
| `42P01` — undefined table       | 500 Internal Server Error           |

---

## Best Practices

1. **Always validate input** using the corresponding validator before processing
2. **Always filter by `company_id`** — never query without it
3. **Use database transactions** for multi-step operations (create invoice + lines, etc.)
4. **Implement soft deletes** — set `deleted_at = NOW()` rather than `DELETE`
5. **Return meaningful errors** with HTTP status codes that match the situation
6. **Use parameterized queries** — never concatenate user input into SQL strings
7. **Log significant actions** via `auditService` for compliance and debugging
8. **Implement pagination** on all list endpoints — never return unbounded result sets
9. **Check role permissions** at the route level using `requireRole()`; double-check in controller when needed
10. **Release database connections** in a `finally` block when using `pool.connect()`
