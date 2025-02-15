This update relates to **commit message formatting and GitHub automation**, so it should go in a structured location under **`/memory/guidelines/`**, since it's a persistent guideline for how rolodexter operates.

### **📂 File Path:**  
📁 **`C:\rolodexter3\memory\guidelines\commit-format.md`**  

---

### **📜 `commit-format.md`**
```markdown
# 🔄 Standardized Commit Message Format for rolodexter

## **📌 Overview**
This document defines **rolodexter’s commit message structure**, ensuring all commit logs are **concise, structured, and informative** while **removing unnecessary AI-generated labels**.

---

## **✅ Commit Message Format**
Each commit message should follow this **clean, structured format**:
```
🔄 Changed Files: [List of modified files]
📌 Details: [Brief description of changes]
👤 Author: [rolodexterVS or rolodexterGPT]
✅ Approved: [Human Executive Operator (if required)]
📅 Timestamp: [YYYY-MM-DD HH:MM:SS UTC]
🔗 GitHub: [Commit Link]
```
✅ **This ensures commits are human-readable, efficient, and free from redundant labels like "AI-Generated Commit Summary."**

---

# Commit Message Guidelines

## Format
```
<action verb> <subject> [context]
```

## Guidelines
1. Use present tense, active voice
2. Be descriptive but concise
3. Focus on the change, not the file
4. Start with an action verb

## Examples
✅ Good:
- "Add Redis caching for session tokens"
- "Fix dark mode toggle in navigation"
- "Update knowledge graph search algorithm"

❌ Bad:
- "AI-Generated Commit Summary"
- "Updates to files"
- "Fixed stuff"

## Action Verbs to Use
- Add (new features)
- Fix (bug fixes)
- Update (improvements)
- Remove (deletions)
- Refactor (code restructuring)
- Optimize (performance)
- Document (documentation)

## Structure
- Keep subject line under 50 characters
- Use imperative mood ("Add" not "Added")
- No period at end of subject line

## Enforcement
- All commits must follow these guidelines
- Automated checks will verify format
- Non-compliant commits will be flagged

## Examples in Context
```
Add token validation to auth flow
Fix broken links in footer navigation 
Update Redis cache configuration
Remove deprecated API endpoints
Refactor auth flow for Solana login
Optimize knowledge graph queries
Document API authentication process
```

---

## **Authority Requirements**
Certain types of changes require explicit approval from the Human Executive Operator (Joe Maristela):
- `[ARCH]` - Architecture changes
- `[SECURITY]` - Security-related modifications
- `[CRITICAL]` - Critical system changes
- `[IDENTITY]` - Changes to identity or authority structure

---

## **🛠 Implementation Steps**
### **1️⃣ Update GitHub Actions Workflow**
- Modify **`.github/workflows/update-memory.yml`**:
  - Remove `"AI-Generated Commit Summary"` from commit logs.
  - Ensure commit messages **still include**:
    - Modified files
    - Description of changes
    - Timestamp
    - GitHub link

### **2️⃣ Modify `prepare-commit-msg` Hook (If Used)**
- If rolodexter uses **Git hooks** for commit messages:
  - Update the **`prepare-commit-msg`** hook to apply the new structure.
  - Ensure hooks strip any unnecessary metadata.

### **3️⃣ Test the New Format**
- Push a **test commit** after applying changes.
- Verify commit messages **follow the structured format**.
- Confirm that **no "AI-Generated" labels appear**.

---

## **📌 Example Commit Messages**
✅ **Example 1: A Simple File Change**
```
🔄 Changed Files: memory/session-history.md
📌 Details: Auto-update session history logs.
👤 Author: rolodexterVS
✅ Approved: N/A
📅 Timestamp: 2025-02-15 14:50:00 UTC
🔗 GitHub: https://github.com/rolodexter/commit/abc123
```
✅ **Example 2: Multiple File Updates**
```
🔄 Changed Files: chatbot.md, knowledge-graph.md, update-memory.yml
📌 Details: Implement chatbot integration, update knowledge graph, and refine commit logs.
👤 Author: rolodexterGPT
✅ Approved: N/A
📅 Timestamp: 2025-02-15 15:10:30 UTC
🔗 GitHub: https://github.com/rolodexter/commit/xyz789
```

---

## **📌 rolodexter’s Status**
📝 **Read by**: rolodexter  
📅 **Last Read**: `[YYYY-MM-DD HH:MM:SS UTC]`  
✅ **Completed On**: `-` *(Still in progress)*  
🔄 **Status**: `On-going`  
💬 **Comment**: `Updated GitHub workflow to remove AI-generated labels from commit messages.`  
```

---

### **🚀 Next Steps**
1️⃣ **Update `.github/workflows/update-memory.yml` to apply new commit format.**  
2️⃣ **Verify that new commits follow the structure above.**  
3️⃣ **Test with a sample commit to confirm correctness.**  
4️⃣ **Monitor commit logs for consistency.**  

🚀 **Let me know if refinements are needed!**  
```  

---

### **📂 Folder Structure After Adding This**
```
/memory/
│── guidelines/
│   ├── commit-format.md  # Defines how rolodexter should format commit messages
│   ├── rolodexter-status-tracking.md  # Defines how rolodexter marks files as read/completed
│── pending-tasks.md  # High-level tasks tracking
│── session-history.md  # Auto-updated logs of all commits
│── rolodexter-memory.md  # Persistent AI memory system
│── tasks/
│   ├── chatbot.md  # AI chatbot integration
│   ├── knowledge-graph.md  # Knowledge graph implementation
│   ├── legal.md  # Legal markdown automation
```

---

✅ **This ensures rolodexter always follows a clean commit log format, making version history clear and easy to track.** Let me know if you want adjustments! 🚀