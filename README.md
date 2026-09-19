# 🚔 Vigilant AI

### AI-Powered Vehicle Number Plate Verification & Police Monitoring System

Vigilant AI is an intelligent police monitoring and vehicle verification platform designed to help law-enforcement teams identify, verify, search, and monitor vehicle number plates using **OCR and AI-powered image processing**.

The system provides a centralized dashboard for managing vehicle information, checkpoints, alerts, police stations, scanning operations, and verification history.

## 🌐 Live Demo

**Live Application:**
https://vigilant-eye-ai-main.vercel.app/auth

## 📌 Project Overview

Vehicle identification and monitoring can become challenging when police teams need to process large amounts of vehicle data quickly.

**Vigilant AI** aims to simplify this process by combining:

* 📷 Vehicle image scanning
* 🔎 Number plate detection and OCR
* 🤖 AI-assisted verification
* 🚨 Alert management
* 🚔 Police station monitoring
* 📊 Dashboard analytics
* 🗄️ Vehicle and checkpoint database
* 📜 Search and verification history

The platform provides a unified interface where authorized users can perform vehicle verification and access relevant monitoring information.

---

## ✨ Key Features

### 🔍 Vehicle Number Plate Scanner

Upload or scan a vehicle image and process the number plate using OCR-based recognition.

### 🤖 AI/OCR Processing

The application includes OCR and AI-related processing components for extracting and analyzing vehicle number plate information.

### 🚨 Alert Management

Provides an interface for viewing and managing vehicle-related alerts.

### 🚔 Police Station Dashboard

Police stations can be monitored through a centralized dashboard containing station-related information.

### 🗺️ Map View

The application includes a map-based interface for visualizing relevant monitoring information.

### 🚘 Vehicle Search

Search for vehicle information using number plate details.

### 📜 Verification History

Maintain and access previous vehicle verification/search records.

### 📊 Monitoring Dashboard

Provides dashboard views for monitoring system information and statistics.

### 👤 Authentication

The application includes an authentication system for controlling access to protected application areas.

---

## 🛠️ Technologies Used

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* React Router
* UI component libraries

### Backend

* Node.js
* JavaScript
* Server-side application logic

### Database & Authentication

* Supabase
* PostgreSQL
* Supabase Authentication

### AI / Computer Vision

* OCR
* Tesseract
* AI Gateway
* Image processing

### Development Tools

* Git
* GitHub
* Vercel
* ESLint
* Prettier
* npm / Bun

---

## 🏗️ Project Architecture

```text
Vigilant AI
│
├── Frontend
│   ├── Authentication
│   ├── Dashboard
│   ├── Vehicle Scanner
│   ├── Vehicle Search
│   ├── Alerts
│   ├── Checkpoints
│   ├── Police Stations
│   └── History
│
├── Backend
│   ├── Server
│   ├── Database Models
│   └── Seed / Utility Scripts
│
├── OCR / AI
│   ├── OCR Processing
│   ├── Vision Functions
│   └── AI Gateway
│
└── Database
    ├── Vehicle Data
    ├── Alerts
    ├── Checkpoints
    └── Police Station Data
```

---

## 🔄 How It Works

```text
Vehicle Image
      │
      ▼
 Image Upload / Scanner
      │
      ▼
 OCR / AI Processing
      │
      ▼
 Number Plate Extraction
      │
      ▼
 Vehicle Verification
      │
      ├───────────────┐
      ▼               ▼
Vehicle Database    Alert System
      │               │
      └───────┬───────┘
              ▼
        Monitoring Dashboard
```

---

## 📂 Main Project Modules

| Module            | Purpose                                   |
| ----------------- | ----------------------------------------- |
| Authentication    | User authentication and protected access  |
| Dashboard         | Central monitoring interface              |
| Scanner           | Vehicle image and number plate processing |
| Upload            | Upload vehicle images for processing      |
| Search            | Search vehicle information                |
| History           | View previous verification activity       |
| Alerts            | Manage and view alerts                    |
| Checkpoints       | Manage checkpoint information             |
| Police Stations   | View police station information           |
| Station Dashboard | Station-level monitoring                  |
| Database          | Vehicle and monitoring data               |
| Map View          | Geographic visualization                  |

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/prathapreddy-mora/vigilant-eye-ai.git
```

### 2. Navigate to the Project

```bash
cd vigilant-eye-ai
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` or `.env.local` file and add the required environment variables for your local environment.

> ⚠️ Never commit `.env`, `.env.local`, API keys, passwords, or other secrets to GitHub.

### 5. Start the Development Server

```bash
npm run dev
```

Then open the local development URL shown in your terminal.

---

## ☁️ Deployment

The application is deployed using **Vercel**.

### Live Application

https://vigilant-eye-ai-main.vercel.app/auth

---

## 🔐 Security

Because this project is designed around vehicle and police-monitoring workflows, sensitive information should be handled carefully.

Recommended practices:

* Never commit API keys.
* Never commit database passwords.
* Keep `.env` files out of Git.
* Use environment variables for credentials.
* Restrict access to protected application routes.
* Use appropriate database security policies.
* Do not publish real sensitive vehicle or police data.

---

## 📸 Screenshots

Add screenshots of your application here.

For example:

```text
screenshots/
├── login.png
├── dashboard.png
├── scanner.png
├── vehicle-search.png
├── alerts.png
└── police-stations.png
```

Then add them to this README:

```markdown
![Dashboard](screenshots/dashboard.png)
```

---

## 🎯 Project Objectives

The main objectives of Vigilant AI are to:

* Automate vehicle number plate recognition.
* Reduce manual vehicle verification effort.
* Provide centralized police monitoring.
* Enable faster vehicle information search.
* Organize vehicle verification history.
* Support checkpoint and police-station monitoring.
* Provide an integrated dashboard for authorized users.

---

## 🔮 Future Enhancements

Possible future improvements include:

* Real-time camera-based number plate detection
* Improved recognition accuracy
* Multi-language number plate support
* Real-time vehicle tracking
* Advanced analytics and reporting
* Mobile application support
* Role-based access control
* Real-time notifications
* Improved AI-based vehicle matching

---

## 👨‍💻 Developer

### Prathap Reddy Mora

**B.Tech — Computer Science & Engineering**

Interested in:

* Software Development
* Full Stack Development
* Artificial Intelligence
* Generative AI
* Computer Vision

### Profiles

* GitHub: https://github.com/prathapreddy-mora
* LinkedIn: https://www.linkedin.com/in/prathap-reddy-mora8540628a/
* Portfolio: https://prathapreddy-mora.github.io/portfolio/

---

## 📄 License

This project is intended for educational, demonstration, and development purposes.

---

## ⭐ Support

If you find this project useful, consider giving the repository a ⭐ on GitHub.

**Vigilant AI — Smarter Vehicle Verification. Smarter Police Monitoring.**
