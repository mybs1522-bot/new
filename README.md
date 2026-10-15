# PDF Paywall Reader & Generator

An enterprise-grade web application that converts any uploaded PDF into a paywalled preview: the **first 2 pages remain crystal clear**, while **page 3 onwards are irreversibly blurred on the server** and overlayed with a high-converting **"Unlock All Books"** paywall call-to-action.

---

## 💡 Is It Doable? (Technical Deep Dive)

**Yes, absolutely 100% doable!** This is the exact business and DRM architecture used by major publishing and document platforms such as Scribd, Course Hero, ResearchGate, and digital bookstores.

### Crucial Security Insight: Why Client-Side Blur Fails

| Method | How It Works | Vulnerability / Security |
| :--- | :--- | :--- |
| ❌ **Client-Side (CSS / Canvas)** | The full PDF is downloaded to the user's browser, and CSS `filter: blur(10px)` is applied. | **High Risk:** Anyone can right-click, open browser Developer Tools (F12), remove the CSS rule, inspect the text, or download the raw unblurred PDF directly from the Network tab. |
| ✅ **Server-Side Rasterization (This Project)** | Pages 1 & 2 are rendered sharp. Pages 3+ are rasterized and **permanently blurred via Gaussian Blur on the server** before sending to the client. | **Enterprise DRM:** The browser **never receives** the unblurred bytes for protected pages until the user completes the paywall unlock. |

---

## 🚀 Key Features

1. **True DRM & Server-Side Security**:
   - Pages 1 & 2: Full vector crisp rendering.
   - Pages 3+: Irreversible Gaussian blur (`Pillow.ImageFilter.GaussianBlur`) computed on the backend.
2. **Interactive Paywall UI**:
   - Glassmorphic paywall banner on every blurred page.
   - Prominent **"Unlock All Books"** CTA button with glowing gradient effects.
   - Checkout modal with subscription plans ($9.99/mo, $49/yr), promo code support (`DEMO`), and instant unlock simulation.
3. **Dynamic Reader Experience**:
   - Continuous scroll and single-page flip modes.
   - Interactive thumbnail sidebar showing locked vs. free pages.
   - Zoom controls (In, Out, Reset, Fit).
4. **Export Options**:
   - **Download Blurred Preview PDF**: Generates an actual PDF file where pages 3+ are permanently blurred into the document with a paywall stamp (perfect for email lead magnets or public previews).
   - **Download Full PDF**: Downloads original crisp document once unlocked.
5. **Instant Testing (No PDF needed)**:
   - Includes a built-in **"Load Sample 6-Page Book"** button that dynamically generates *"The Agentic AI Handbook"* so you can test immediately with 1 click!

---

## 🛠️ Tech Stack

- **Backend**: Python 3.10+, FastAPI, PyMuPDF (`pymupdf`), Pillow (`PIL`), Uvicorn
- **Frontend**: Vanilla JavaScript (ES6+), Tailwind CSS (Dark theme), Lucide Icons, Canvas Confetti

---

## 🏃 Quick Start Guide

### 1. Requirements
Ensure you have Python installed, then install the dependencies:
```bash
pip install -r requirements.txt
```

### 2. Run the Web Server
Execute:
```bash
python main.py
```
*(Or double-click `run.bat` on Windows)*

### 3. Open in Browser
Open your browser and navigate to:
```
http://localhost:8000
```

---

## 🧪 How to Test the Paywall

1. Open `http://localhost:8000`.
2. Click **"Load Sample 6-Page Book"** (or upload any multi-page PDF).
3. Notice that **Page 1 and Page 2** are completely crisp and readable.
4. Scroll to **Page 3**: Notice that the page is permanently blurred and displays the **"Unlock All Books"** paywall card.
5. Click **"Unlock All Books"** (or click *"⚡ Or click here for 1-Click Instant Demo Unlock"* or enter code `DEMO`).
6. 🎉 Confetti explodes, the paywall drops, and all remaining pages immediately load in full, sharp resolution!
7. Open **Settings** (slider icon top right) to re-lock the document or adjust the free preview page threshold anytime.
