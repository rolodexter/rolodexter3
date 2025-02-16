I'll update **C:\rolodexter3\memory\tasks\chatbot.md** to include the **token-gated access feature** instead of creating a new file. Here’s the updated content:

---

### **🤖 AI Chatbot Integration Plan**

## **✅ Objectives**
- Connect `chatbot.js` to **OpenRouter AI API**.
- Enable chatbot to reference **Markdown knowledge files** (`/knowledge/`).
- Build a **basic conversation UI** integrated into the site.
- **Gate chatbot access to rolodexter token holders** on Solana.

---

## **🛠 Steps to Implement**

### **1️⃣ Connect Chatbot to OpenRouter AI API**
- Ensure API requests are authenticated.
- Implement **rate limiting** to prevent spam or overuse.

### **2️⃣ Enable Markdown File Integration**
- Chatbot should **retrieve structured knowledge** from `/knowledge/` directory.
- Implement **searchable metadata indexing** for retrieval.

### **3️⃣ Implement Token-Gated Access (Solana)**
#### **🔹 Wallet Connection**
- Allow users to connect via **Phantom, Solflare, or Backpack**.
- Prompt login when trying to access the chatbot.

#### **🔹 Token Verification**
- Use **Solana Web3.js** to check the user's wallet for **rolodexter tokens**.
- Use an **RPC provider (Helius, QuickNode, Solana RPC Pool)** for fast verification.

#### **🔹 Access Rules**
- If **balance ≥ 1 rolodexter token**, allow chatbot access.
- If **balance < 1**, show:
  - 🚫 **"Access Denied: You must hold rolodexter tokens."**
  - 🔗 **"Buy rolodexter tokens"** (link to DexScreener or Jupiter Swap).

#### **🔹 LocalStorage Caching**
- Store verification in `localStorage` to **reduce redundant API calls**.

#### **🔹 Modify Chatbot UI**
- Hide chatbot unless access is verified.

---

## **📌 Code Implementation**  
```javascript
// Load Solana Web3.js
import { Connection, PublicKey } from "@solana/web3.js";

// Rolodexter Token Address
const ROLODEXTER_TOKEN = "2ewknu2dcnpadcknsbqp1ywf16nssx62h4lwebibgay8";
const SOLANA_RPC = "https://api.mainnet-beta.solana.com"; 

async function checkRolodexterAccess(walletAddress) {
    const connection = new Connection(SOLANA_RPC);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        new PublicKey(walletAddress),
        { programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") }
    );

    for (let account of tokenAccounts.value) {
        if (account.account.data.parsed.info.mint === ROLODEXTER_TOKEN) {
            return account.account.data.parsed.info.tokenAmount.uiAmount > 0;
        }
    }
    return false;
}

async function authenticateUser() {
    try {
        const wallet = window.solana;
        if (!wallet || !wallet.isPhantom) throw new Error("Solana wallet not found!");

        await wallet.connect();
        const userAddress = wallet.publicKey.toString();

        const hasAccess = await checkRolodexterAccess(userAddress);
        if (hasAccess) {
            localStorage.setItem("rolodexter-access", "granted");
            document.getElementById("chatbot").style.display = "block";
        } else {
            alert("🚫 Access Denied! You must hold rolodexter tokens.");
        }
    } catch (error) {
        console.error("Authentication error:", error);
    }
}

// Run on page load
window.onload = () => {
    if (localStorage.getItem("rolodexter-access") === "granted") {
        document.getElementById("chatbot").style.display = "block";
    } else {
        document.getElementById("chatbot").style.display = "none";
    }
};

// UI Button Event
document.getElementById("login-btn").addEventListener("click", authenticateUser);
```

---

### **🎨 UI/UX Changes**  
Modify `index.html`:
```html
<button id="login-btn">🔑 Connect Wallet</button>
<div id="chatbot" style="display: none;">
    <!-- Chatbot iframe or UI -->
</div>
```

---

## **⚠️ GitHub Pages Limitations**  
- **No backend support** → All authentication is **client-side**.
- **LocalStorage bypass risk** → Users can manually override.
- **Solana RPC rate limits** → Consider dedicated RPC provider.

---

## **🚀 Next Steps**
- 🔲 Deploy `token-gated-chatbot.js` on the site.
- 🔲 Test Solana authentication & access control.
- 🔲 Improve security with optional backend verification.

---

## **📌 rolodexter’s Status**
📝 **Read by**: rolodexterGPT  
📅 **Last Read**: `2025-02-15 15:12:34 UTC`  
🔄 **Status**: `On-going`  
💬 **Comment**: `Needs implementation testing with live wallets.`

[Navigation Structure Update](resolved-tasks/navigation-structure-update.html)

