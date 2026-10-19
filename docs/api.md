# PujoMap — API Reference

Base URL prefix: `/api/v1`

---

## 1. Authentication

### `POST /auth/register`
Create a new visitor account. (Public registration *never* grants administrator privileges).

* **Request Body:**
```json
{
  "name": "Sourav Ganguly",
  "email": "sourav@example.com",
  "password": "Password123!",
  "confirmPassword": "Password123!"
}
```

* **Response (201 Created):**
```json
{
  "success": true,
  "message": "Account registered successfully. Welcome to PujoMap!",
  "user": {
    "id": "675000000000000000000001",
    "name": "Sourav Ganguly",
    "email": "sourav@example.com",
    "role": "visitor"
  }
}
```

### `POST /auth/login`
Authenticate with email and password. Sets HTTP-only `token` cookie.

### `POST /auth/logout`
Clears HTTP-only `token` cookie.

### `GET /auth/me`
Returns the currently authenticated user's profile.

---

## 2. Public Pandal Discovery

### `GET /pujas`
Returns official approved pandals (`status: 'approved'`).

* **Query Parameters:**
  - `q` (string): Text search across pandal name, address, locality, and description.
  - `locality` (string): Exact or partial locality filter.
  - `category` (string): Pandal category filter.
  - `lat`, `lng` (float): Optional user coordinates for geospatial proximity calculation.
  - `radius` (int): Search radius in meters (default 20,000m).

* **Response (200 OK):**
```json
{
  "success": true,
  "count": 11,
  "pujas": [
    {
      "_id": "675000000000000000000002",
      "name": "Bagbazar Sarbojanin Durgotsav",
      "slug": "bagbazar-sarbojanin-durgotsav",
      "locality": "Bagbazar, North Kolkata",
      "address": "7/1, Bagbazar Street, Near Girish Park Metro",
      "category": "Traditional / Heritage",
      "location": {
        "type": "Point",
        "coordinates": [88.3667, 22.6025]
      },
      "images": ["/uploads/bagbazar.jpg"],
      "status": "approved",
      "distanceMeters": 420
    }
  ]
}
```

### `GET /pujas/slug/:slug`
Fetches a single pandal by URL slug, including its on-demand crowd estimate, recent associated community posts, and nearby pandals.

### `GET /pujas/:id`
Fetches a pandal by its MongoDB ObjectId.

---

## 3. Pandal Suggestions & Contributions

### `POST /contributions` (Auth required)
Submit a suggestion for a new Durga Puja pandal. Always created with `pending` status.

* **Request Body:**
```json
{
  "name": "Nabin Pally Sarbojanin",
  "address": "Station Road, 2nd Lane",
  "locality": "Naihati, North 24 Parganas",
  "category": "Community / Baroari",
  "coordinates": [88.4239, 22.8944],
  "timings": "Open 24 Hours",
  "description": "Traditional neighborhood celebration."
}
```

* **Response (201 Created):**
```json
{
  "success": true,
  "message": "Thank you! Your pandal suggestion has been submitted for owner review.",
  "puja": { ... },
  "hasPossibleDuplicates": false,
  "possibleDuplicates": []
}
```

### `GET /contributions/mine` (Auth required)
Returns all pandal suggestions submitted by the logged-in user with their current status (`pending`, `approved`, or `rejected` with `rejectionReason`).

---

## 4. Crowd Reporting & Estimation

### `POST /pujas/:pujaId/crowd-reports` (Auth required)
Submit an on-site crowd observation for an approved pandal.

* **Validation Rule:** Coordinates must be within **300 meters** of the pandal's registered location.

* **Request Body:**
```json
{
  "crowdLevel": "moderate",
  "estimatedWaitMinutes": 20,
  "coordinates": [88.3668, 22.6026],
  "gpsAccuracy": 12,
  "source": "gps",
  "imageReference": null
}
```

* **Response (201 Created):**
```json
{
  "success": true,
  "message": "Thank you! Your crowd observation has been recorded.",
  "observationId": "675000000000000000000005",
  "updatedEstimate": {
    "crowdStatus": "moderate",
    "confidence": "high",
    "observationCount": 4,
    "freshnessStatus": "fresh",
    "estimatedWaitMinutes": 18
  }
}
```

### `GET /pujas/:pujaId/crowd`
Returns the on-demand calculated crowd estimate for a specific pandal.

### `GET /crowd/map`
Returns batch crowd estimates for requested pandals (`?ids=id1,id2,...`).

---

## 5. Community Posts

### `POST /posts` (Auth required)
Publish a community post with photographs, descriptions, and optional pandal reference.

### `GET /posts`
Public community feed of published posts. Supports pagination (`?page=1&limit=10`) and filtering by `locality` and `category`.

### `GET /posts/mine` (Auth required)
Returns posts created by the authenticated user.

### `DELETE /posts/:id` (Auth required)
Allows the post author or application owner to delete a post.

---

## 6. Owner Administration (Requires `admin` role)

* `GET /admin/contributions`: Returns pending pandal suggestions along with duplicate similarity analysis.
* `PATCH /admin/contributions/:id/review`: Approve (`status: 'approved'`) or reject (`status: 'rejected'`, with `rejectionReason`).
* `GET /admin/pujas`: Lists all pandals with filter options.
* `PATCH /admin/pujas/:id`: Edit details of any pandal record.
* `GET /admin/posts/reports`: Lists flagged or reported community posts.
* `PATCH /admin/posts/:id/moderate`: Update post moderation status (`published`, `flagged`, `hidden`).
