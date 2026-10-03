# Food Truck API

A minimal Node.js and Express backend created specifically for a Postman/Newman API testing portfolio. Data is stored in memory and resets whenever the server restarts.

## Installation and startup

```bash
cd food-truck-api
npm install
npm start
```

Base URL: `http://localhost:3003`

## Environment variables

The included `.env` file defines:

| Variable | Default value | Purpose |
| --- | --- | --- |
| `PORT` | `3003` | Server port |
| `API_KEY` | `foodtruck-qa-2026` | Required API key for order and bill APIs |
| `TAX_PERCENT` | `5` | Tax percentage used for bills |

## Endpoints

| Method | Endpoint | Protection | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | None | Check server health |
| POST | `/auth/register` | None | Register a user |
| POST | `/auth/login` | None | Log in and receive a token |
| POST | `/auth/logout` | Bearer token | Invalidate the current token |
| GET | `/menu` | None | Filter, sort, and paginate menu items |
| GET | `/menu/:id` | None | Get one menu item |
| POST | `/orders` | Bearer token + API key | Create an order |
| GET | `/orders/:id` | Bearer token + API key | Get an order |
| PUT | `/orders/:id` | Bearer token + API key | Replace an order's items |
| DELETE | `/orders/:id` | Bearer token + API key | Delete an order |
| POST | `/bills` | Bearer token + API key | Generate a bill once per order |
| GET | `/bills/:billId/receipt` | Bearer token + API key | Get a bill receipt |

`GET /menu` supports `category`, `available`, `minPrice`, `maxPrice`, `sort`, `page`, and `limit`. Use `sort=price` for ascending price or `sort=-price` for descending price. Pagination defaults to page 1 with a limit of 5.

## Expected headers

Order and bill requests require both headers:

```text
Authorization: Bearer <token returned by login>
X-API-Key: foodtruck-qa-2026
```

JSON requests should also send `Content-Type: application/json`.

## Example flow

Register:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Kushagra","email":"kush@test.com","password":"Test@123"}'
```

Log in and copy the returned `token`:

```bash
curl -X POST http://localhost:3003/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"kush@test.com","password":"Test@123"}'
```

Create an order:

```bash
curl -X POST http://localhost:3003/orders \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -H 'X-API-Key: foodtruck-qa-2026' \
  -d '{"items":[{"menuItemId":"ITEM-101","quantity":2}]}'
```

Generate its bill:

```bash
curl -X POST http://localhost:3003/bills \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -H 'X-API-Key: foodtruck-qa-2026' \
  -d '{"orderId":"ORD-1001"}'
```

This backend intentionally stays small and dependency-light. It exists for testing authentication, API keys, API chaining, CRUD, filters, sorting, pagination, schemas, data-driven requests, status codes, and business rules in Postman and Newman.

# API Test Automation

## Purpose

This repository is a portfolio-ready API QA project. It tests the Express Food Truck API with Postman collections, Newman CLI, JSON data, HTML reporting, and GitHub Actions while keeping the backend deliberately small and easy to understand.

The checked-in Postman environment targets `http://localhost:3000`, as does CI. The current local `.env` starts the API on port `3003`, so use `PORT=3000 npm start` when running these collections locally. This configuration difference is documented rather than hidden by changing the backend.

One contract detail discovered from source inspection is also reflected in the tests: successful registration returns the identifier as `data.userId`, not `data.id`.

## Coverage

The automation covers positive and negative authentication, API chaining, order CRUD, bearer-token lifecycle, API-key rejection, filters, sorting, pagination, query and path parameters, response contracts, business calculations, JSON Schema validation, variable scopes, pre-request scripts, post-response assertions, JSON data-driven testing, Newman, HTML reports, GitHub Actions, and GitHub Pages.

Assertions verify returned values, field types, array contents, filtering and ordering behavior, pagination metadata, order and bill arithmetic, persistence, deletion, and token invalidation—not only HTTP status codes.

## Architecture

```text
GitHub Actions
      |
      +--> Start Express API on port 3000
      |
      +--> Wait for /health
      |
      +--> Newman
              |
              +--> Functional Collection
              |
              +--> Data-Driven Collection
              |       |
              |       +--> login-test-data.json
              |
              +--> Assertions, API chaining, JSON Schema
              |
              +--> HTML reports
                      |
                      +--> Actions artifact
                      +--> GitHub Pages
```

## Collection organization

The functional collection runs in dependency order:

| Folder | Responsibility |
| --- | --- |
| `00 Health` | Availability, JSON response, and response-time check |
| `01 Authentication` | Registration, login, token extraction, invalid credentials, and protected-route failures |
| `02 Menu` | Seed lookup, filters, price sorting, pagination, combined queries, and negative cases |
| `03 Orders` | Create, retrieve, replace, persistence, total calculation, API-key checks, and authorization checks |
| `04 Bills` | Bill generation, receipt chaining, arithmetic, duplicate prevention, and not-found behavior |
| `05 Cleanup and Security Verification` | Delete verification, logout, and proof that the logged-out token is rejected |

The second collection contains only `Register Setup User` and `Login Validation`, keeping iteration-data behavior isolated from the normal functional run.

## Variable strategy

| Scope | Variables | Why this scope is used |
| --- | --- | --- |
| Environment | `baseUrl`, `apiKey` | Values that change between runtime environments |
| Collection | `testEmail`, `testPassword`, `userId`, `token`, `orderId`, `billId` | Chained values shared by requests in one collection run |
| Local | `requestId` | A fresh request-only value created from `{{$randomUUID}}` |
| Dynamic | `{{$randomUUID}}` | Unique emails and request IDs without hardcoded state |
| Iteration | Login inputs and expected results | One independent scenario from `login-test-data.json` per Newman iteration |

No global variables are used. Each collection-level pre-request script verifies `baseUrl` and creates `requestId`; individual requests then send `X-Request-Id: {{requestId}}`.

## API chaining

The main flow is:

```text
Register -> userId -> Login -> token -> Create Order -> orderId
         -> Generate Bill -> billId -> Receipt -> Delete -> Logout
```

Response values are extracted with `pm.collectionVariables.set(...)` and consumed by later requests. The final request deliberately reuses the old token and expects HTTP 401, proving that logout invalidates server-side session state.

## Data-driven testing

Each object in [test-data/login-test-data.json](test-data/login-test-data.json) becomes one Newman iteration:

```text
login-test-data.json
        -> Newman -d
        -> pm.iterationData
        -> shared Login Validation request
        -> actual response compared with expectedStatus,
           expectedSuccess, expectedMessage, and expectedErrorCode
```

The setup request derives a unique runtime email from each row's `registerEmail`, so repeated runs against the same in-memory server do not collide. `loginEmail`, credentials, and all expected values still come from iteration data through `pm.iterationData.get(...)`.

A negative API scenario is a passing automation test when the server returns the expected error. For example, a wrong password correctly returning HTTP 401 and `INVALID_CREDENTIALS` passes its Newman assertions.

Run all six data scenarios with:

```bash
npm run test:data
```

## Newman commands

Newman and the HTML Extra reporter are local development dependencies, so no global installation is needed:

```bash
npm install
npm run test:api
npm run test:data
npm run test:api:report
```

- `npm run test:api` runs the functional collection in the CLI.
- `npm run test:data` runs six JSON-driven login scenarios and creates `reports/data-driven.html`.
- `npm run test:api:report` runs the functional collection and creates `reports/index.html`.

## HTML reports

Generated reports are written to:

- `reports/index.html` — functional API tests
- `reports/data-driven.html` — data-driven login tests

Open either file in a browser after its command finishes. CI also uploads both as a downloadable `newman-html-reports` artifact for every run where they can be generated.

## Continuous integration and GitHub Pages

`.github/workflows/api-tests.yml` installs dependencies, starts the API with `PORT=3000`, waits up to 60 seconds for `/health`, runs both collections, generates reports, and uploads the reports even if Newman reports a failure. The workflow then fails when either collection failed. Reports deploy to GitHub Pages only after successful tests on a push, avoiding publication of a misleading failed run.

Enable GitHub Pages with **Source: GitHub Actions** in the repository settings before the first deployment.

## Run locally

Terminal 1:

```bash
npm install
PORT=3000 npm start
```

Terminal 2:

```bash
npm run test:api
npm run test:data
npm run test:api:report
```
