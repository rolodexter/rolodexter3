Here’s the complete **`chatbot.md`** file for `C:\rolodexter3\memory\tasks\chatbot.md`, structured for **clarity, explicit task breakdowns, and integration steps**.  

---

## **📂 File Path:** `C:\rolodexter3\memory\tasks\chatbot.md`  

```markdown
# 🤖 AI Chatbot Integration Plan

## **📌 Overview**
The goal is to integrate an **AI-powered chatbot** into the rolodexter website that:
- Uses **OpenRouter AI API** for LLM responses.
- References **Markdown knowledge files** (`/knowledge/`) as a structured knowledge base.
- Supports **contextual memory**, allowing users to ask follow-up questions.
- Provides a **seamless user experience** with an interactive UI.

---

## ✅ **Core Features**
### **1️⃣ Chat Interface**
- [ ] Implement a **floating chat widget** on all website pages.
- [ ] Ensure **UI theme matches light/dark mode settings**.
- [ ] Display **system status indicators** (e.g., "Connected to rolodexter AI").
- [ ] Store **session-based chat memory** (cleared when page reloads).

### **2️⃣ OpenRouter AI API Integration**
- [ ] Connect `chatbot.js` to **OpenRouter AI API**.
- [ ] Secure API key using **environment variables** or a proxy.
- [ ] Implement **error handling** (e.g., API downtime, rate limits).
- [ ] Support **adjustable temperature & response length settings**.

### **3️⃣ Knowledge Graph & Markdown Parsing**
- [ ] Enable chatbot to **search and retrieve structured data** from `/knowledge/`.
- [ ] Parse **Markdown files (`.md`)** to extract relevant information.
- [ ] Implement **semantic search** for more accurate responses.
- [ ] Ensure chatbot can **cite sources** from retrieved content.

### **4️⃣ Memory & Context Awareness**
- [ ] Implement **basic short-term memory** (stores last 5-10 messages).
- [ ] Allow users to **reset memory** via UI command.
- [ ] Provide an option for **session-based memory persistence**.
- [ ] Future upgrade: **Long-term AI memory stored in `/memory/chat-history/`**.

### **5️⃣ Security & Privacy**
- [ ] Ensure chatbot **does not expose API keys** in frontend code.
- [ ] Implement **request throttling** to prevent abuse.
- [ ] Provide **opt-out options** for logging chat history.

---

## **📂 File & Code Structure**
```
/scripts/
│── chatbot.js  # Core chatbot logic
│── chatbot-ui.js  # Manages chat UI components
│── chatbot-config.js  # Stores OpenRouter API key & settings
/memory/
│── chat-history/  # Stores session-based logs
│── tasks/
│   ├── chatbot.md  # This file
/knowledge/
│── *.md  # Knowledge base files chatbot will reference
```

---

## **🔄 API Request Example**
📂 **Modify `chatbot.js` to include this basic API request:**
```javascript
async function queryOpenRouterAI(userMessage) {
    const API_KEY = "YOUR_API_KEY_HERE";  // Use env variable in production
    const response = await fetch("https://openrouter.ai/api/v1/chat", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "gpt-4",
            messages: [{ role: "user", content: userMessage }],
            max_tokens: 500
        })
    });

    const data = await response.json();
    return data.choices[0].message.content;
}
```

---

## **📌 rolodexter’s Status**
📝 **Read by**: rolodexter  
📅 **Last Read**: `[YYYY-MM-DD HH:MM:SS UTC]`  
✅ **Completed On**: `-` *(Still in progress)*  
🔄 **Status**: `On-going`  
💬 **Comment**: `I need API access details from Joe to proceed with OpenRouter integration.`  
```

---

## **🚀 Next Steps**
1️⃣ **Create `chatbot.js`, `chatbot-ui.js`, and `chatbot-config.js` under `/scripts/`.**  
2️⃣ **Secure OpenRouter API Key in a config file.**  
3️⃣ **Test retrieval of `.md` knowledge base content.**  
4️⃣ **Integrate UI into the website.**  
5️⃣ **Monitor logs and user interactions for improvements.**  

🚀 **Let me know if refinements are needed!**  
