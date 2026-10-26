# SaveSlot REST API Specification & Reference Guide

**System**: SaveSlot RESTful Application Programming Interface  
**Protocol**: HTTPS / JSON  
**Authentication**: HTTP-Only Secure Cookie Session (`saveslot_session`)  
**Validation**: Zod 4 Runtime Schema Contracts  

---

## 1. Overview & Protocol Standards

All API routes are hosted under `/api/*`. Route handlers validate incoming payloads with strict Zod schemas and enforce institutional tenant boundary isolation (`campus_id`).

### 1.1 Standard Response Formats

#### Success Response

```json
{
  "events": [...],
  "pagination": { "total": 42, "limit": 20, "offset": 0 }
}
```

#### Error Response

Standard error payloads conform to a unified contract:

```json
{
  "error": "Descriptive human-readable error message"
}
```

### 1.2 HTTP Status Code Matrix

| Status Code | Meaning | Context |
| :--- | :--- | :--- |
| `200 OK` | Request succeeded | Standard GET read, update, or login success |
| `201 Created` | Resource created | Event proposal or user creation |
| `400 Bad Request` | Validation failure | Malformed JSON body or failed Zod schema parsing |
| `401 Unauthorized` | Unauthenticated | Missing or expired session cookie |
| `403 Forbidden` | Access denied | User lacks the required role or campus membership |
| `404 Not Found` | Resource missing | Target entity ID does not exist |
| `409 Conflict` | Concurrency / Double-booking clash | Venue booked during concurrent approval |
| `429 Too Many Requests` | Rate limited | Exceeded 5 failed login attempts in 15 minutes |
| `500 Server Error` | Unhandled failure | Database connection or transaction failure |

---

## 2. Public Endpoints (No Authentication Required)

### 2.1 `GET /api/events`

Fetches a paginated, filtered feed of campus events for calendar feeds and notice board cards.

- **Query Parameters**:
  - `campus_id` *(optional, string)*: Filter events by campus UUID (defaults to primary campus).
  - `status` *(optional, string)*: Filter by event lifecycle state (`published`, `pending`, `all`). Default: `published`.
  - `category` *(optional, string)*: Filter by category (`Tech`, `Cultural`, `Sports`, `Career`, `Academic`, `Social`, `Workshop`).
  - `community_id` *(optional, string)*: Filter by organizing club UUID.
  - `start` *(optional, ISO 8601 string)*: Earliest start timestamp filter.
  - `end` *(optional, ISO 8601 string)*: Latest end timestamp filter.
  - `search` *(optional, string)*: Case-insensitive text search against title, description, or host name.
  - `limit` *(optional, integer)*: Results limit (default: `50`, max: `100`).
  - `offset` *(optional, integer)*: Pagination offset (default: `0`).

- **Response (`200 OK`)**:

```json
{
  "events": [
    {
      "id": "e4b3c2a1-0000-0000-0000-000000000001",
      "title": "Annual Hackathon 2026",
      "slug": "annual-hackathon-2026",
      "category": "Tech",
      "start_time": "2026-11-15T09:00:00.000Z",
      "end_time": "2026-11-15T18:00:00.000Z",
      "location_name": "Turing Auditorium",
      "target_audience": ["All Students"],
      "tags": ["coding", "hackathon"],
      "community": {
        "id": "c1a2b3c4-0000-0000-0000-000000000001",
        "name": "Coding Club",
        "slug": "coding-club",
        "logo_url": "/images/coding-logo.png"
      },
      "venue": {
        "id": "v1a2b3c4-0000-0000-0000-000000000001",
        "name": "Turing Auditorium",
        "building": "Computer Science Center",
        "capacity": 250
      }
    }
  ]
}
```

---

### 2.2 `GET /api/venues`

Returns all active physical venues available on campus.

- **Query Parameters**:
  - `campus_id` *(optional, string)*: Filter by campus UUID.
  - `active_only` *(optional, boolean)*: Return only active bookable venues (default: `true`).

- **Response (`200 OK`)**:

```json
{
  "venues": [
    {
      "id": "v1a2b3c4-0000-0000-0000-000000000001",
      "name": "Turing Auditorium",
      "building": "Computer Science Center",
      "capacity": 250,
      "address": "CS Building, 1st Floor",
      "notes": "Dual 4K projectors",
      "is_active": true
    }
  ]
}
```

---

### 2.3 `GET /api/communities`

Returns recognized student communities, clubs, and academic societies.

- **Query Parameters**:
  - `campus_id` *(optional, string)*: Filter by campus UUID.

- **Response (`200 OK`)**:

```json
{
  "communities": [
    {
      "id": "c1a2b3c4-0000-0000-0000-000000000001",
      "name": "Coding Club",
      "slug": "coding-club",
      "category": "Tech",
      "description": "Campus student development community",
      "logo_url": "/images/coding-logo.png"
    }
  ]
}
```

---

### 2.4 `POST /api/conflicts/check`

Calculates real-time venue clashes and evaluates policy compliance. Computes 3 alternative "Safe Slots" if a collision is detected.

- **Request Body**:

```json
{
  "venueId": "v1a2b3c4-0000-0000-0000-000000000001",
  "startTime": "2026-11-15T14:00:00.000Z",
  "endTime": "2026-11-15T17:00:00.000Z",
  "excludeEventId": null,
  "campusId": "optional-campus-uuid"
}
```

- **Response (`200 OK`)**:

```json
{
  "hasConflict": true,
  "leadTimeWarning": false,
  "conflictingEvents": [
    {
      "id": "e4b3c2a1-...",
      "title": "Robotics Workshop",
      "startTime": "2026-11-15T13:00:00.000Z",
      "endTime": "2026-11-15T15:30:00.000Z",
      "communityName": "Robotics Club"
    }
  ],
  "safeSlotSuggestions": [
    {
      "type": "same_venue_later",
      "label": "Same venue at 4:00 PM (30m buffer)",
      "startTime": "2026-11-15T16:00:00.000Z",
      "endTime": "2026-11-15T19:00:00.000Z",
      "venueId": "v1a2b3c4-0000-0000-0000-000000000001"
    },
    {
      "type": "alternative_venue",
      "label": "Seminar Hall A at same time",
      "startTime": "2026-11-15T14:00:00.000Z",
      "endTime": "2026-11-15T17:00:00.000Z",
      "venueId": "v2b3c4d5-..."
    },
    {
      "type": "next_day_same_time",
      "label": "Next day (Nov 16) at 2:00 PM",
      "startTime": "2026-11-16T14:00:00.000Z",
      "endTime": "2026-11-16T17:00:00.000Z",
      "venueId": "v1a2b3c4-0000-0000-0000-000000000001"
    }
  ]
}
```

---

## 3. Authentication & Session Endpoints

### 3.1 `POST /api/auth/login`

Authenticates users, verifies password hash, and issues an HTTP-only JWT cookie. Protected by distributed atomic rate-limiting (`auth_rate_limits`).

- **Request Body**:

```json
{
  "email": "lead.coding@campus.edu",
  "password": "lead123"
}
```

- **Success (`200 OK`)**:
Sets `saveslot_session` cookie and returns:

```json
{
  "user": {
    "id": "u1a2b3c4-...",
    "email": "lead.coding@campus.edu",
    "fullName": "Alex Chen (Coding Lead)",
    "role": "organizer",
    "communityId": "c1a2b3c4-...",
    "campusId": "ca1a2b3c-..."
  }
}
```

- **Rate-Limited (`429 Too Many Requests`)**:
Triggered after 5 failed attempts in 15 minutes.
Headers: `Retry-After: 300`

```json
{
  "error": "Account temporarily locked due to repeated failed login attempts. Try again in 5 minutes."
}
```

---

### 3.2 `POST /api/auth/logout`

Clears session cookie (`saveslot_session`).

- **Response (`200 OK`)**:

```json
{ "success": true }
```

---

### 3.3 `GET /api/auth/me`

Returns current user session profile.

- **Response (`200 OK` or `401 Unauthorized`)**:

```json
{
  "user": {
    "id": "u1a2b3c4-...",
    "email": "principal@campus.edu",
    "fullName": "Dr. K. S. Mathew (Principal)",
    "role": "principal",
    "campusId": "ca1a2b3c-..."
  }
}
```

---

## 4. Community Lead Endpoints (`/api/lead/*`)

*Requires authenticated session with role `organizer` or `admin`.*

### 4.1 `GET /api/lead/events`

Returns all events proposed by or belonging to the lead's assigned community.

- **Response (`200 OK`)**: Array of event records with status chips (`pending`, `published`, `rejected`).

---

### 4.2 `POST /api/lead/events`

Proposes a new event for administrative triage.

- **Request Body**:

```json
{
  "title": "React 19 Workshop",
  "description": "Deep dive into React 19 Server Components",
  "category": "Tech",
  "venueId": "v1a2b3c4-...",
  "startTime": "2026-11-20T14:00:00.000Z",
  "endTime": "2026-11-20T17:00:00.000Z",
  "targetAudience": ["Computer Science", "Engineering"],
  "tags": ["react", "webdev"],
  "externalRegistrationUrl": "https://campus.edu/rsvp",
  "coverImageUrl": null
}
```

- **Validation Rules**:
  - `startTime` must be at least 7 days in advance (`start_time >= now() + 7 days`). Submissions violating this policy receive a 400 error unless flagged for urgent override.
  - Target venue cannot clash with an existing approved/pending event. If a double-booking is detected, returns `409 Conflict`.

- **Response (`201 Created`)**: Created event row with status `pending`.

---

### 4.3 `PUT /api/lead/events/[id]`

Modifies a pending event proposal.

- **Response (`200 OK`)**: Updated event row.

---

### 4.4 `DELETE /api/lead/events/[id]`

Withdraws an event proposal before or after review.

- **Response (`200 OK`)**: `{ "success": true }`.

---

## 5. Executive & Admin Endpoints (`/api/admin/*`)

*Requires authenticated session with role `admin`, `principal`, or `vice_principal`.*

### 5.1 `POST /api/admin/events/[id]/status`

Performs executive triage: approve & publish or reject with written feedback.

- **Concurrency Protection**: Executes inside a PostgreSQL transaction with `SELECT ... FOR UPDATE` row locks to prevent TOCTOU race conditions.

- **Request Body**:

```json
{
  "status": "published", // or "rejected"
  "rejectionReason": null // required if status is "rejected"
}
```

- **Response (`200 OK`)**:

```json
{
  "event": {
    "id": "e4b3c2a1-...",
    "status": "published",
    "reviewed_by": "u1a2b3c4-...",
    "updated_at": "2026-10-26T14:00:00.000Z"
  }
}
```

---

### 5.2 Venue & Community Operations (`/api/admin/venues`, `/api/admin/communities`)

*Requires `admin` role.*

- `GET /api/admin/venues`: Full venue inventory with active toggles.
- `POST /api/admin/venues`: Add new campus venue.
- `PATCH /api/admin/venues`: Update venue details or toggle active status.
- `GET /api/admin/communities`: Manage recognized clubs.
- `POST /api/admin/communities`: Onboard a new student community.
- `PATCH /api/admin/communities/[id]`: Update community profile or approval status.

---

### 5.3 User Management (`/api/admin/users`)

*Requires `admin` role.*

- `GET /api/admin/users`: List of all campus accounts.
- `POST /api/admin/users`: Provision a new Community Lead or Admin account with initial credentials and community assignment.
- `PATCH /api/admin/users/[id]`: Update user roles or profile.
- `DELETE /api/admin/users/[id]`: Deactivate account.
