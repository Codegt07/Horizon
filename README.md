# InvestMate

InvestMate is a full-stack investment marketplace built with the MERN stack. Investors can browse funding opportunities, invest virtual money, and track their portfolio. Fundraisers can create and manage their own opportunities and see who has invested.

> **This is a simulated platform. No real money is involved. All funds and investments are virtual.**

---

## Features

### Authentication
- Register and log in with email and password
- Google OAuth sign-in with profile completion step for new OAuth users
- JWT stored in HttpOnly cookies — no tokens in localStorage
- Rate limiting on login and register endpoints
- Protected and role-gated routes on both frontend and backend

### Role-Based Access Control

Every user has one of two roles assigned at registration:

**Investor**
- Browse all active investment opportunities
- View individual opportunity details and funding progress
- Deposit virtual funds to their wallet
- Invest in opportunities (subject to minimum investment and available balance)
- View transaction history and portfolio

**Fundraiser**
- Create investment opportunities (as draft or active)
- Edit their own opportunities (draft and active only — not closed)
- Delete draft opportunities
- View the list of investors for each of their opportunities
- Track funding progress across all their opportunities

Users can only access pages and perform actions that belong to their role. The frontend redirects to the home page if a user tries to access a route for the wrong role. The backend enforces the same permissions independently through middleware.

### Investment Opportunities
- Opportunity statuses: `draft`, `active`, `closed`
- Draft opportunities are not visible to investors
- An opportunity automatically closes when its raised amount reaches the target
- Investors are redirected to Browse Opportunities after a fully funded investment

### Wallet
- Investors start with a zero balance
- Deposits are simulated (max ₹1,00,000 per transaction)
- Full transaction history (deposits and investments)
- Balance is updated in real time after each action

### Validation
- Server-side validation using Zod on all write endpoints
- Client-side validation with inline field errors on all forms

### UI
- Responsive layout for mobile, tablet, and desktop
- Consistent pointer cursor on all interactive buttons
- Loading states, empty states, and error messages throughout

---

## Technologies Used

### Backend
| Technology | Purpose |
|---|---|
| Node.js (≥ 20) | Runtime |
| Express.js | Web framework |
| MongoDB | Database |
| Mongoose | ODM for schema and queries |
| JSON Web Tokens (`jsonwebtoken`) | Authentication tokens |
| bcryptjs | Password hashing |
| Passport.js + passport-google-oauth20 | Google OAuth |
| Zod | Request validation |
| Helmet | HTTP security headers |
| CORS | Cross-origin resource sharing |
| express-rate-limit | Rate limiting |
| cookie-parser | HttpOnly cookie handling |
| dotenv | Environment variables |

### Backend Testing
| Technology | Purpose |
|---|---|
| Jest | Test runner |
| Supertest | HTTP integration testing |
| mongodb-memory-server | In-memory MongoDB for tests |

### Frontend
| Technology | Purpose |
|---|---|
| React 19 | UI library |
| React Router v7 | Client-side routing |
| Axios | HTTP client |
| Tailwind CSS v4 | Utility-first styling |
| Vite | Build tool and dev server |
| ESLint | Linting |

---

## Project Structure

```
Horizon/
├── backend/
│   ├── src/
│   │   ├── app.js               # Express app setup, middleware, routes
│   │   ├── config/              # DB connection, env validation, Passport setup
│   │   ├── controllers/         # Request handlers (auth, opportunity, investment, wallet)
│   │   ├── middlewares/         # authenticate, requireRole, errorHandler
│   │   ├── models/              # Mongoose models (User, Opportunity, Investment, Transaction)
│   │   ├── routes/              # Route definitions
│   │   ├── services/            # Business logic (separated from controllers)
│   │   ├── utils/               # Shared helpers (response formatting)
│   │   └── validators/          # Zod schemas for request validation
│   ├── tests/                   # Jest integration and unit tests
│   ├── server.js                # Entry point — connects DB and starts server
│   ├── .env.example             # Template for environment variables
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/                 # Axios instance (withCredentials, base URL)
    │   ├── components/          # Shared UI components
    │   │   ├── DashboardLayout.jsx
    │   │   ├── ProtectedRoute.jsx
    │   │   ├── RoleRoute.jsx
    │   │   ├── OpportunityCard.jsx
    │   │   ├── OpportunityForm.jsx
    │   │   ├── StatCard.jsx
    │   │   ├── EmptyState.jsx
    │   │   └── LoadingSpinner.jsx
    │   ├── context/             # AuthContext — global auth state
    │   ├── pages/
    │   │   ├── Home.jsx
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── CompleteProfile.jsx
    │   │   ├── investor/        # Overview, BrowseOpportunities, OpportunityDetails,
    │   │   │                    # MyInvestments, Wallet
    │   │   └── fundraiser/      # Overview, MyOpportunities, CreateOpportunity,
    │   │                        # EditOpportunity, OpportunityInvestors
    │   ├── App.jsx              # Route definitions and role guards
    │   └── main.jsx
    └── package.json
```

---

## Setup and Installation

### Requirements
- Node.js v20 or higher
- MongoDB (local installation or MongoDB Atlas)
- A Google Cloud project with OAuth 2.0 credentials *(only needed for Google sign-in)*

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd Horizon
```

### 2. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Configure backend environment variables

Copy the example file and fill in your values:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
# Server
NODE_ENV=development
PORT=5000

# MongoDB
MONGO_URI=mongodb://localhost:27017/investmate

# JWT
JWT_SECRET=your_strong_random_secret_here
JWT_EXPIRES_IN=7d

# Google OAuth (leave blank if not using Google sign-in)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Frontend URL (used for CORS and OAuth redirects)
CLIENT_URL=http://localhost:5173
```

> **Email/password login works without Google credentials.** If `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are not set, the Google OAuth routes will fail, but registration and login with email and password will work normally.

### 4. Configure frontend environment variables (optional)

The frontend uses Vite's dev proxy to forward `/api/*` requests to the backend at `localhost:5000`, so no extra configuration is needed for local development.

If you need to point to a different backend URL, create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
```

### 5. Set up MongoDB

If you are using a local MongoDB installation, make sure the MongoDB service is running before starting the backend. If you are using MongoDB Atlas, replace `MONGO_URI` in your `.env` with your Atlas connection string.

---

## Running the Application

Open two terminal windows.

**Terminal 1 — Backend:**

```bash
cd backend
npm run dev
```

The backend starts at: `http://localhost:5000`

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
```

The frontend starts at: `http://localhost:5173`

Open `http://localhost:5173` in your browser.

---

## Running Tests

Tests are located in `backend/tests/` and use an in-memory MongoDB instance, so no running database is needed.

```bash
cd backend
npm test
```

To also generate a coverage report:

```bash
npm run test:coverage
```

Test files cover: authentication, Google OAuth, opportunity CRUD, investments, wallet, user model, and the health endpoint.

---

## API Overview

All routes require authentication unless noted.

### Auth — `/api/auth`
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/register` | Public | Register with email and password |
| POST | `/login` | Public | Log in with email and password |
| POST | `/logout` | Authenticated | Log out and clear cookie |
| GET | `/me` | Authenticated | Get current user |
| GET | `/google` | Public | Start Google OAuth flow |
| GET | `/google/callback` | Public | Google OAuth callback |
| POST | `/complete-profile` | Partial token | Complete profile after OAuth |

### Opportunities — `/api/opportunities`
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/` | Both roles | List opportunities (investors see active only) |
| GET | `/:id` | Both roles | Get a single opportunity |
| POST | `/` | Fundraiser | Create an opportunity |
| PATCH | `/:id` | Fundraiser | Update an opportunity |
| DELETE | `/:id` | Fundraiser | Delete a draft opportunity |

### Investments — `/api/investments`
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/` | Investor | Make an investment |
| GET | `/my` | Investor | Get my investment portfolio |
| GET | `/opportunity/:id` | Fundraiser | Get investors for an opportunity |

### Wallet — `/api/wallet`
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/deposit` | Investor | Deposit virtual funds |
| GET | `/balance` | Investor | Get current wallet balance |
| GET | `/transactions` | Investor | Get transaction history |

---

## AI Development Tool

**AI Development Tool: Kiro**

Kiro was used as an AI development assistant during the development of InvestMate.

---

## AI Development Experience

I came up with the InvestMate idea and planned what it should do before any code was written. I decided the two user roles, what each role could do, how the investment and wallet flows should work, and what validation rules the system needed. I also defined constraints such as wallet limits, investment minimums, and how an opportunity should close when it reaches its target.

I split the development into phases and gave Kiro specific instructions for each one — covering the backend API, database models, authentication, frontend dashboards, and later improvements like responsive layout, UI polish, and bug fixes. After each phase, I reviewed what was built before moving on. When the implementation did not match my requirements or something behaved incorrectly, I investigated the issue, traced the cause with Kiro's help, and gave instructions to fix it.

I checked lint results, production builds, and automated test output regularly during development. One example: I noticed that a successful investment that fully funded an opportunity was showing both a success message and an "Opportunity not found" error at the same time. I investigated the cause, identified that the frontend was trying to refresh a closed opportunity that investors cannot access, and guided the fix — detecting the fully funded state before making refresh calls and redirecting the user instead.

I also reviewed the generated code for structure and correctness rather than accepting it blindly. I requested changes to UI flows, responsive layouts, button behaviour, and code comments when the output needed improvement.

Using Kiro helped me move faster and explore more of the MERN stack than I could have done alone in the same time. At the same time, I had to understand the requirements clearly, review whether the implementation was correct, test the results, and decide what needed to change. The planning, requirements, and review decisions were mine throughout the project.

---

## How I Used Kiro

1. **Backend API Development** — Used Kiro to assist with building the authentication, opportunity, wallet, and investment APIs, including request validation, error handling, and middleware setup.

2. **Database Integration** — Used Kiro's assistance while working with MongoDB and Mongoose models for users, opportunities, investments, and transactions. This included schema design, validation rules, and relationships between documents.

3. **Frontend Development** — Used Kiro to assist with authentication pages, role-based dashboards, forms, reusable components, and client-side route protection.

4. **Debugging and Testing** — Used Kiro to help investigate errors, understand API responses, and resolve issues found during testing, including the investment success/error bug and layout issues found during review.

5. **Refactoring and UI Improvements** — Used Kiro to assist with code cleanup, theme consistency, responsive layouts, button behaviour, and improvements to user flows such as the fully funded redirect.

In each case, I provided the requirements and constraints, reviewed the results, and verified that the implementation matched what I had specified.

---

## Future Improvements

These are ideas for future development — none of them are currently implemented:

- **Email verification** — verify a user's email address at registration
- **Investment returns simulation** — calculate and display estimated returns over time
- **Opportunity search and filters** — filter by target amount, deadline, or funding progress
- **Fundraiser analytics** — charts for funding trends across opportunities
- **Password reset** — allow users to reset their password via email
