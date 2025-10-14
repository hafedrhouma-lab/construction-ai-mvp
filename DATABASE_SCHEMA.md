# 🗄️ QuickBids Database Schema - Entity Relationship Diagram

## 📊 Complete Schema Overview

```
┌─────────────────┐
│     USERS       │
│  (Who uses QB)  │
├─────────────────┤
│ id (PK)         │
│ email           │
│ first_name      │
│ last_name       │
│ company_name    │
│ role            │
│ status          │
└────────┬────────┘
         │
         │ 1:N
         │
         ├──────────────────────────────────────────┐
         │                                          │
         ▼                                          ▼
┌─────────────────┐                        ┌─────────────────┐
│   CUSTOMERS     │                        │COMPANY_COST_RATES│
│ (Who we bid for)│                        │  (User Pricing) │
├─────────────────┤                        ├─────────────────┤
│ id (PK)         │                        │ id (PK)         │
│ user_id (FK)    │                        │ user_id (FK)    │
│ name            │                        │ rate_type       │
│ email           │                        │ item_name       │
│ company         │                        │ cost_per_unit   │
│ city, state     │                        │ vendor          │
└────────┬────────┘                        └─────────────────┘
         │
         │ N:1
         │
         ▼
┌─────────────────┐
│    PROJECTS     │
│ (Bid Projects)  │
├─────────────────┤
│ id (PK)         │
│ user_id (FK)    │◄──────────┐
│ customer_id (FK)│           │ 1:N
│ name            │           │
│ description     │           │
│ status          │           │
└────────┬────────┘           │
         │                    │
         │ 1:N                │
         │                    │
         ├────────────────────┼────────────────┐
         │                    │                │
         ▼                    ▼                ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│     FILES       │  │EXTRACTION       │  │   ESTIMATES     │
│  (PDF/Video)    │  │  SESSIONS       │  │ (Final Bids)    │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ id (PK)         │  │ id (PK)         │  │ id (PK)         │
│ user_id (FK)    │  │ user_id (FK)    │  │ user_id (FK)    │
│ project_id (FK) │  │ file_id (FK)    │  │ session_id (FK) │
│ s3_key          │  │ project_id (FK) │  │ project_id (FK) │
│ file_type       │  │ status          │  │ total_cost      │
│ page_count      │  │ current_step    │  │ line_items      │
│ metadata        │  │ current_page    │  │ status          │
│ status          │  │ analyzed_pages  │  └─────────────────┘
└────────┬────────┘  └────────┬────────┘
         │                    │
         │ 1:N                │ 1:N
         │                    │
         └────────────────────┤
                              │
                              ▼
                    ┌─────────────────┐
                    │  SCOPE ITEMS    │
                    │(Extracted Items)│
                    ├─────────────────┤
                    │ id (PK)         │
                    │ session_id (FK) │
                    │ project_id (FK) │
                    │ item_name       │
                    │ quantity        │
                    │ unit            │
                    │ unit_cost       │◄────────┐
                    │ total_cost      │         │
                    │ page_numbers[]  │         │ 1:N
                    │ user_confirmed  │         │
                    │ user_modified   │         │
                    └────────┬────────┘         │
                             │                  │
                             │ 1:N              │
                             │                  │
                             ▼                  │
                    ┌─────────────────┐         │
                    │SCOPE_ITEM_      │         │
                    │ CORRECTIONS     │◄────────┘
                    │(Training Data!) │
                    ├─────────────────┤
                    │ id (PK)         │
                    │ scope_item_id   │
                    │ session_id (FK) │
                    │ project_id (FK) │
                    │ field_name      │
                    │ ai_value        │  ← Original AI
                    │ user_value      │  ← Human fix
                    │ was_accepted    │  ← Confirm/Correct
                    │ page_number     │
                    │ timestamp       │
                    └─────────────────┘
```

---

## 🔑 Key Relationships

### **User-Centric Model**
```
USER (1) ──→ (N) CUSTOMERS
USER (1) ──→ (N) PROJECTS
USER (1) ──→ (N) FILES
USER (1) ──→ (N) EXTRACTION_SESSIONS
USER (1) ──→ (N) ESTIMATES
USER (1) ──→ (N) COMPANY_COST_RATES
```

### **Project-Centric Data**
```
PROJECT (1) ──→ (N) FILES
PROJECT (1) ──→ (N) EXTRACTION_SESSIONS
PROJECT (1) ──→ (N) SCOPE_ITEMS
PROJECT (1) ──→ (N) ESTIMATES
```

### **Extraction Flow**
```
FILE (1) ──→ (N) EXTRACTION_SESSIONS
SESSION (1) ──→ (N) SCOPE_ITEMS
SCOPE_ITEM (1) ──→ (N) CORRECTIONS
SESSION (1) ──→ (1) ESTIMATE
```

---

## 📋 Table Descriptions

### **Core Tables**

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | System users | email, company_name, role |
| `customers` | Bid recipients | name, company, contact info |
| `projects` | Bid projects | name, customer_id, status |

### **File Management**

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `files` | Uploaded PDFs/videos | s3_key, file_type, page_count, metadata |

### **AI Extraction**

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `extraction_sessions` | Extraction runs | status, current_step, analyzed_pages |
| `scope_items` | Extracted line items | item_name, quantity, unit, unit_cost |
| `scope_item_corrections` | **Training data!** | ai_value, user_value, was_accepted |

### **Estimation**

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `estimates` | Final bids | total_cost, line_items, status |
| `company_cost_rates` | User pricing | rate_type, item_name, cost_per_unit |

---

## 🎯 Dataset Export Structure

For training data (the gold!):

```sql
SELECT 
  p.name as project_name,
  sc.page_number,
  sc.field_name,
  sc.ai_value,        -- What AI said
  sc.user_value,      -- What human corrected to
  sc.was_accepted,    -- Did user confirm or correct?
  sc.timestamp
FROM scope_item_corrections sc
JOIN projects p ON sc.project_id = p.id
WHERE 
  -- Only from projects with generated estimates (gold data!)
  EXISTS (
    SELECT 1 FROM estimates e 
    WHERE e.project_id = p.id
  )
ORDER BY sc.timestamp;
```

**Output:**
```
project_name         | page | field    | ai_value | user_value | accepted | timestamp
---------------------|------|----------|----------|------------|----------|----------
Atlanta Striping     | 3    | quantity | 150      | 175        | false    | 2025-10-13
Atlanta Striping     | 3    | unit     | LF       | LF         | true     | 2025-10-13
Atlanta Striping     | 7    | unit_cost| 2.50     | 2.75       | false    | 2025-10-13
```

---

## 🔄 Data Flow

### **1. User Creates Project**
```sql
INSERT INTO projects (user_id, customer_id, name)
VALUES ('user-123', 'customer-456', 'Atlanta Striping');
```

### **2. User Uploads PDF**
```sql
INSERT INTO files (user_id, project_id, s3_key, file_type)
VALUES ('user-123', 'project-789', 's3://bucket/file.pdf', 'pdf');
```

### **3. Start AI Extraction**
```sql
INSERT INTO extraction_sessions (user_id, file_id, project_id)
VALUES ('user-123', 'file-abc', 'project-789');
```

### **4. AI Extracts Items**
```sql
INSERT INTO scope_items (session_id, project_id, item_name, quantity, unit)
VALUES ('session-def', 'project-789', 'Parking stripe', 150, 'LF');
```

### **5. User Reviews & Corrects**
```sql
-- User changes quantity from 150 → 175
UPDATE scope_items SET quantity = 175 WHERE id = 'item-ghi';

-- Log the correction (GOLD DATA!)
INSERT INTO scope_item_corrections 
  (scope_item_id, session_id, project_id, field_name, ai_value, user_value, was_accepted)
VALUES 
  ('item-ghi', 'session-def', 'project-789', 'quantity', '150', '175', false);
```

### **6. Generate Estimate**
```sql
INSERT INTO estimates (user_id, session_id, project_id, total_cost, line_items)
VALUES ('user-123', 'session-def', 'project-789', 8250.00, '[...]');
```

---

## ✅ Schema Improvements from v1

| Feature | v1 | v2 |
|---------|----|----|
| Users table | ❌ | ✅ |
| Customers table | ❌ | ✅ |
| user_id on all tables | ❌ | ✅ |
| unit_cost in scope_items | ❌ | ✅ |
| Proper FK relationships | ⚠️ | ✅ |
| Dataset export ready | ⚠️ | ✅ |

---

## 🚀 Ready to Use!

Run the new schema:
```bash
# Drop old database (if testing)
dropdb quickbids
createdb quickbids

# Run new schema
psql quickbids < schema_v2.sql
```

**Result:**
- ✅ 1 demo user created
- ✅ 2 test customers created
- ✅ 1 test project created
- ✅ 5 cost rates added
- ✅ All relationships configured
