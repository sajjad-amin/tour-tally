<p align="center">
  <img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="300" alt="Laravel Logo" />
</p>

<h1 align="center">TourTally</h1>

<p align="center">
  <strong>Collaborative Group Tour Coordination &amp; Travel Expense Management Platform</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Laravel-12.x-FF2D20?style=for-the-badge&logo=laravel&logoColor=white" alt="Laravel 12" />
  <img src="https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Bootstrap-5.3-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white" alt="Bootstrap 5.3" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge" alt="MIT License" />
</p>

---

## 🧭 About TourTally

**TourTally** is a full-featured web application tailored for group travelers, backpackers, tour organizers, and friends traveling together. It simplifies itinerary planning, explorer rosters, invitation tracking, shared expense logging, and balance settlements.

Built using an API-first **Client-Server Architecture** with **Laravel 12** powering a secure RESTful API and **React 19 / Vite** delivering a fast, responsive Single Page Application (SPA).

---

## 🛠️ Tech Stack & Architecture

### Backend
- **Framework:** Laravel 12 on PHP 8.2+
- **Authentication:** Laravel Sanctum (cookie-based SPA authentication) & Laravel Socialite (Google OAuth 2.0)
- **Authorization:** Spatie Laravel Permission (`Server Admin` and `User / Explorer` roles)
- **Database Primary Keys:** Strict **UUIDv4** across all models (`HasUuids`)
- **Notifications:** Laravel Database Notifications with UUID morph targets
- **Database Engine:** SQLite (default for development/testing) or MySQL 8.0+

### Frontend
- **Framework:** React 19 Single Page Application (SPA)
- **Build Tool:** Vite 6
- **Routing:** React Router v7 with nested layout routing and URL search param synchronization
- **State & Data Fetching:** TanStack React Query v5 with zero-stale-time cache synchronization
- **Styling:** Bootstrap 5.3 (dark & light theme engine with FOUC-prevention) + Bootstrap Icons
- **HTTP Client:** Axios with CSRF cookie handling and automatic 401 session recovery
- **Notifications & Alerts:** Toastr service with custom Bootstrap-styled modals (no native `window.confirm`)

---

## ✨ Features Implemented (Phases 1 - 3)

### 1. Authentication & Security
- **Registration & Login:** Standard email/password registration with public registration toggle support.
- **Google OAuth 2.0:** One-click sign-in via Google with automatic profile and avatar synchronization.
- **Password Reset:** Signed email reset links with password update safeguards.
- **Email Verification:** Signed email verification links with rate-limited resend capabilities.
- **Session Recovery:** Global interceptor detecting session expirations and gracefully redirecting to login.

### 2. User & Profile Management
- **Self Profile Management:** Edit full name, phone number, avatar URL, WhatsApp link, and Messenger link.
- **Password Change:** Secure password verification before updating credentials.
- **Account Self-Deletion:** Two-factor modal confirmation requiring `"CONFIRM DELETE"` text plus password/email verification.
- **Server Admin User Management:** Admin dashboard with search, role filters, user list pagination, self-edit synchronization, and protected account removal safeguards.

### 3. Tour Management (Phase 3)
- **Tour CRUD:** Create, edit, and delete tours with name, destination, start/end dates, and itinerary notes.
- **Status Sorting:** Strict status-based hierarchy (`active` > `planning` > `completed`).
- **Confirmation Safeguards:** Custom Bootstrap delete modals requiring `"DELETE"` confirmation phrase.
- **Nested Tour Layout Routing:**
  - `/tours/:id` &rarr; **Tour Overview:** destination stats, notes, and Organizer Profile.
  - `/tours/:id/members` &rarr; **Tour Members:** roster list, admin badges, and invitation actions.
  - `/tours/:id/expenses` &rarr; **Tour Expenses:** group expense ledger placeholder (Phase 4).
- **Dashboard Separation:** Distinct visual sections for "Pending Invitations" and "My Tours", preserved across page refreshes via URL search parameters (`?filter=all`, `?filter=joined`, `?filter=pending`).

### 4. Member Invitation & Visibility Logic
- **Strict Exact-Email Search:** Tour Admins can search registered users exclusively by exact email (`POST /api/tours/{tour}/members/search`).
- **Live User Card Preview:** Displays user's avatar, name, and email with immediate checks for active membership or pending invitations before sending.
- **Member Profile Modal:** One-click modal to inspect any explorer's or organizer's full details:
  - Avatar image or stylized initials
  - Full email address (with copy button)
  - Phone number (clickable `tel:`)
  - Direct WhatsApp chat link (`wa.me`)
  - Direct Messenger chat link (`m.me`)
- **Remove Member Security:** Requires typing `"REMOVE"` or the member's first name to prevent accidental removals.

### 5. Notification System
- **Database Notifications:** Instant notifications for tour invitations (`TourInvitationNotification`) and member joins (`TourMemberJoinedNotification`).
- **Interactive Header Dropdown:** Real-time unread badges, timestamp formatting (`time_ago`), mark as read, and "Mark all read".
- **Dedicated Notifications Page:** Full `/notifications` view with pagination and "Clear all" capabilities.

---

## 🚀 Installation & Local Setup

### Prerequisites
- **PHP** >= 8.2
- **Composer** >= 2.0
- **Node.js** >= 18.0 & **npm** >= 9.0

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/sajjad-amin/tour-tally.git
cd tour-tally
```

---

### Step 2: Backend Setup (Laravel)
```bash
# Install PHP dependencies
composer install

# Create environment configuration
cp .env.example .env

# Generate application encryption key
php artisan key:generate

# Run migrations and seed default administrative roles and data
php artisan migrate --seed

# Start the Laravel backend development server
php artisan serve
```
The backend API will run at `http://localhost:8000`.

---

### Step 3: Frontend Setup (React / Vite)
Open a separate terminal window:
```bash
cd frontend

# Install JavaScript dependencies
npm install

# Start Vite development server
npm run dev
```
The frontend SPA will run at `http://localhost:5173`.

---

### Step 4: Building for Production
To bundle and compile the React application directly into Laravel's public asset directory:
```bash
cd frontend
npm run build
```
Once built, Laravel serves the compiled Single Page Application directly from `http://localhost:8000` via its catch-all web fallback route.

---

## 🧪 Running Automated Tests

TourTally includes a comprehensive PHPUnit test suite covering authentication, authorization, tour management, invitations, notifications, and security policies.

```bash
# Run all tests
php artisan test

# Run tour management feature tests specifically
php artisan test --filter=TourTest
```

---

## 📁 Project Directory Structure

```
TourTally/
├── app/
│   ├── Http/Controllers/Api/   # RESTful API controllers (Auth, Tours, Members, Notifications)
│   ├── Models/                 # Eloquent models using HasUuids (User, Tour, TourMember)
│   └── Notifications/          # Database notification classes
├── config/                     # Application and package configurations
├── database/
│   ├── migrations/             # Database migrations with UUID primary keys
│   └── seeders/                # Default roles and permissions seeder
├── frontend/                   # React 19 Vite Single Page Application
│   ├── src/
│   │   ├── components/         # Shared UI cards, layout, navigation & guards
│   │   ├── context/            # Global contexts (Auth, Tour, Notification)
│   │   ├── features/           # Feature modules (auth, dashboard, profile, tours, users, notifications)
│   │   ├── router/             # React Router v7 route declarations
│   │   ├── services/           # Axios API service layer and Toastr helpers
│   │   └── main.jsx            # Application entry point
│   └── vite.config.js          # Vite config with proxy settings to Laravel
├── routes/
│   ├── api.php                 # Sanctum-protected REST API routes
│   └── web.php                 # OAuth callbacks and SPA fallback routing
├── tests/
│   └── Feature/                # Feature test suite (AuthTest, TourTest, UserTest, NotificationTest)
└── README.md
```

---

## 📄 License

This software is open-sourced under the [MIT license](LICENSE).
