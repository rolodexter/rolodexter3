# 🚀 Pending Tasks for rolodexter (AI Assistant)

🟢 **All tasks should be read, tracked, and updated automatically by rolodexter.**
🟢 **This file should be referenced at the start of every session.**
🟢 **Each major task now has its own `.md` file under `/memory/tasks/`.**
---

## ✅ **High-Priority Tasks**
### 1️⃣ **Persistent Memory & Logs**
- [x] Implement **persistent memory system** in `/memory/` folder. ✅ *(Completed)*
- [ ] Automate **session history updates** every 5 minutes if changes exist.
  - 🔹 Track last commit, file changes, and author.
  - 🔹 Ensure commits only happen when needed to avoid empty pushes.
  - 🔹 Timestamp every read action in `pending-tasks.md`.

### 2️⃣ **Light/Dark Mode Toggle**
- [ ] Implement **light/dark mode toggle** in `styles.css`.
  - 🔹 Store user preference using **local storage**.
  - 🔹 Ensure **theme switch does not require a page refresh**.
  - 🔹 Default to system preference (`prefers-color-scheme`).

### 3️⃣ **Navigation & Content Restructuring**
- [ ] Update **top navigation & footer** to include:
  - 🔹 **"Media"** (for ARGs, literary works, and creative content).
  - 🔹 **"Knowledge"** (for the interactive knowledge graph).
- [ ] Move **"rolodexter Labs"** content into `/labs/`
  - 🔹 Organize **technical research separately** from the main site.
  - 🔹 Create `/labs/index.md` for structured research documentation.

### 4️⃣ **Chatbot Integration (OpenRouter AI API)**
📂 **[Detailed breakdown in `/memory/tasks/chatbot.md`]**
- [ ] Connect **chatbot.js** to OpenRouter AI API.
- [ ] Enable chatbot to reference **Markdown knowledge files** (`/knowledge/`).
- [ ] Build a **basic conversation UI** integrated into the site.
- [ ] Implement **AI response caching** for efficiency.

### 5️⃣ **Interactive Knowledge Graph (D3.js)**
📂 **[Detailed breakdown in `/memory/tasks/knowledge-graph.md`]**
- [ ] Build **interactive knowledge graph** using **D3.js**.
- [ ] Load data dynamically from `.md` files in `/knowledge/`.
- [ ] Implement:
  - 🔹 **Click-based expansion of nodes**.
  - 🔹 **Search functionality** for fast lookups.
  - 🔹 **Hover tooltips** with contextual info.
  - 🔹 **Mobile responsiveness**.
  - 🔹 **Efficient rendering** for large datasets.

---

## 🔄 **In Progress**
### 6️⃣ **Legal & Compliance Automation**
📂 **[Detailed breakdown in `/memory/tasks/legal.md`]**
- [ ] Generate **legal markdown files**:
  - 🔹 `/legal/privacy-policy.md`
  - 🔹 `/legal/terms-of-use.md`
  - 🔹 `/legal/cookies-policy.md`
- [ ] Ensure **correct linking** in footer and headers.
- [ ] Format content to align with **rolodexter’s mission**.

### 7️⃣ **Persistent Memory & Session Tracking**
- [x] Establish **structured memory organization** for session history and task tracking.
- [ ] Improve `session-history.md` logging format.
  - 🔹 Log **commit author, timestamp, and file changes**.
  - 🔹 Include **previous commit hashes** for reference.

---

## 🔹 **Notes**
- rolodexter should **update this file automatically** every time it is read.
- Each **major feature now has a dedicated `.md` file** inside `/memory/tasks/`.
- **Legal documents are being rewritten** to align with rolodexter’s mission.
- **Footer links now reference local legal pages** instead of Google policies.

---

## 📅 **Last Read by rolodexter**  
📌 **Timestamp:** `[YYYY-MM-DD HH:MM:SS UTC]`
