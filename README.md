# FounderOS — Strategic Command Center for Indian Startup Founders

FounderOS is a premium, professional-grade strategic platform designed specifically for the Indian venture and startup ecosystem. It empowers founders to transition from being solely "Product-focused" to "CFO-ready" by automating complex financial modeling, equity tracking, runway management, and sales operations.

---

## 🚀 Key Feature Suites

### 1. Finance Suite
*   **Startup Valuation Calculator**:
    *   *VC-Method Modeling*: Calculate implied pre-money and post-money valuations based on investment targets and equity offered.
    *   *Revenue Multiples*: Compare valuations against industry-standard multiples (SaaS, AI, FinTech, DeepTech, etc.).
    *   *Exit proceeds analysis*: Evaluate the impact of Liquidation Preference Multiples (1x, 2x) and Participation styles (Participating vs. Non-Participating) on final exit payouts.
*   **Unit Economics Dashboard**:
    *   Calculate Lifetime Value (LTV) using profit margins, Customer Acquisition Cost (CAC), and monitor the LTV:CAC health ratio (Target > 3x).
    *   Track Break-even CAC to understand the absolute ceiling for customer acquisition spend.
*   **Cap Table Dilution Engine**:
    *   *Founder-Centric Dilution*: Registry-style tracking optimized for proprietorships/early stages starting at 100%.
    *   *Dilution Simulator*: Simulate dilution from upcoming rounds (Seed, Series A) or ESOP pool allocations.
*   **Founder's Glossary & AI Term Sheet Q&A** *(Consolidated)*:
    *   *Jargon Dictionary*: Browse startup jargon (e.g., ROFR, Tag-Along, Drag-Along, Liquidation Preference) with real-world Indian market examples (in ₹).
    *   *AI Term Sheet Chatbot*: Ask custom questions directly to an interactive AI assistant to identify terms, analyze risk clauses, and flag potential founder traps in term sheets.

---

### 2. Sales Tracker Suite
*   **Sales Strategy Generator**:
    *   Generate strategic goals and execution playbooks tailored to your target audience.
    *   *Strategy Version History*: Click "Generate New Strategy" to automatically archive previous versions with precise date and time logging.
*   **Value-Driven Sales Strategy**:
    *   Access cold-calling script templates, sales qualification guides, and objection-handling logs.
*   **Weekly & Daily Activity Tracking**:
    *   Log weekly performance targets and record daily cold-calling/sales activities to keep the pipeline populated.

---

### 3. Operations Hub
*   **Survival Runway & SaaS Burn Calculator**:
    *   Track SaaS subscriptions with flexible billing options (**Monthly** or **Yearly** billing cycles) and category assignments (Cloud Hosting, AI & APIs, SaaS, Marketing, etc.).
    *   Input active and planned team salaries plus monthly general overhead.
    *   View real-time monthly burn breakdowns synced with valuations.
*   **Runway & Cash Simulator**:
    *   An interactive slider panel to simulate adjustments in monthly revenue growth, SaaS cost efficiencies/cuts (%), and salary shifts (₹/mo) to instantly visualize simulated runways.
*   **Task Workspace & Team Chat**:
    *   Collaborative task manager supporting role assignment, priorities, due dates, and quick task creation directly from chat streams.
*   **Operations Dashboards**:
    *   Log weekly operations deliverables and daily activity updates.

---

### 4. Product Suite
*   **Product Strategy Planner**:
    *   Generate product vision statements, user personas, and target definitions.
    *   Save, compare, and restore previous strategy versions.
*   **Feature Roadmap & Prioritization**:
    *   Prioritize feature requests using Value vs. Complexity scoring systems.
    *   Generate standardized User Stories with Acceptance Criteria.

---

## 🛠️ Technical Stack
*   **Frontend**: Next.js 15 (App Router, Turbopack), React 19, Tailwind CSS, Radix UI.
*   **Backend & DB**: Firebase Firestore (Real-time data synchronization).
*   **Authentication**: Firebase Authentication.
*   **AI Orchestration**: Google Genkit & Gemini 2.5 Flash.

---

## 💻 Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   Firebase Project configuration (set up in environment variables)

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure your environment variables by setting up `.env.local` with your Firebase client details:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Access the application locally at `http://localhost:9002` (or the port specified in your terminal).

---
*Built for Indian Startup Founders • FounderOS Intelligence*
