# QuickSnip AI 

**Silent Chrome extension for AI-powered screen OCR and instant answer detection**

Manifest V3 Chrome extension that captures screen areas, extracts text using GPT-4 Vision OCR, and displays answers with nearly invisible UI. Perfect for online tests, quizzes, and quick information lookup.
> 💡 **Looking for a free version?** Check out QuickSnip-AI Free https://github.com/CheffCorleOne/QuickSnip-AI-Free with Openroute models
---

## ✨ Key Features

- **🔇 Stealth Mode**: Ultra-minimal UI with barely visible answer popup (0.6 opacity, light gray text)
- **⚡ Instant OCR**: GPT-4 Vision extracts text from any screen area
- **🤖 AI-Powered**: ChatGPT analyzes questions and provides precise answers
- **⌨️ Hotkey Support**: `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (Mac)
- **👻 Nearly Invisible**: Transparent selection overlay, subtle answer display
- **🚀 Fast Processing**: Two-step AI pipeline (OCR → Answer)

---

## 🛠️ Installation

### 1. Get OpenAI API Key

Visit [OpenAI Platform](https://platform.openai.com/api-keys) and create an API key.

### 2. Configure Extension

Open `background.js` and find **line 150**:

```javascript
apiKey = "PASTE YOUR API HERE";
```

Replace with your actual API key:

```javascript
apiKey = "sk-proj-YourActualAPIKeyHere...";
```

### 3. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the extension folder
5. Done! Extension icon appears in toolbar

---

## 📖 How to Use

### Activation

**Method 1**: Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on Mac)  
**Method 2**: Click the extension icon

### Capture & Answer

1. **Select area**: Click and drag to select question area
2. **Wait**: Processing happens silently (no loading indicators)
3. **View answer**: Small gray text appears in bottom-right corner
4. **Close**: Click the answer popup or wait 15 seconds for auto-removal

### Finding the Answer

The answer appears as a **barely visible popup**:
- Position: Bottom-right corner
- Style: Light gray text (0.6 opacity)
- Behavior: Hovers over on mouse for better visibility
- Auto-removes after 4 seconds (can be changes in snipper.js)

---

## 🎨 Stealth Design Philosophy

QuickSnip AI is designed to be **nearly undetectable**:

### Visual Elements

- **Selection overlay**: `rgba(0, 0, 0, 0.001)` - practically invisible
- **Selection border**: `rgba(200, 200, 200, 0.15)` - ultra-subtle
- **Answer popup**: `rgba(200, 200, 200, 0.7)` text on translucent white background
- **No loading indicators**: No spinners, progress bars, or status messages
- **Minimal footprint**: Tiny popup in corner, auto-dismisses

### Technical Stealth

- No browser notifications
- No console logs in production
- Silent API calls in background
- Instant cleanup after capture

---

## 🔧 Technical Details

### Architecture

**Two-Step AI Pipeline:**

1. **OCR Extraction** (GPT-4o-mini Vision)
   - Extracts all text from captured image
   - Returns raw text exactly as it appears
   
2. **Answer Generation** (GPT-4o-mini Chat)
   - Analyzes extracted text
   - Identifies correct answer option
   - Returns minimal response (A/B/C or text)

### Files Structure

```
QuickSnip-AI/
├── manifest.json       # Extension configuration
├── background.js       # Core logic: API calls, OCR, processing
├── snipper.js         # UI: selection overlay, capture, answer display
└── README.md          # This file
```

### API Configuration

The extension uses **hardcoded API key** in `background.js` for simplicity:

```javascript
// Line 150 in background.js
if (!apiKey || apiKey.includes("your-openai-key")) {
    apiKey = "PASTE YOUR API HERE";  // ← EDIT THIS
}
```

**Why hardcoded?**
- Simpler setup (no settings UI needed)
- Faster deployment
- For personal use only

---

## 🔐 Privacy & Security

- **No data storage**: Nothing saved to disk or cloud
- **Direct API calls**: Your data goes only to OpenAI
- **No tracking**: Zero analytics or telemetry
- **Local processing**: Image cropping happens in browser

⚠️ **Important**: Keep your API key private. Don't share your modified `background.js` file.

---

## 💰 Cost Estimation

Using GPT-4o-mini (cheapest model):

- **OCR call**: ~$0.0001-0.0003 per image
- **Answer call**: ~$0.00005 per question
- **Total per question**: ~$0.0002-0.0004

*100 questions ≈ $0.02-0.04 USD*

Check current pricing: [OpenAI Pricing](https://openai.com/api/pricing/)

---

## 🚨 Limitations

- **Screenshot quality matters**: Blurry text = poor OCR results
- **API rate limits**: OpenAI has usage limits on free tier
- **Chrome only**: Works on Chrome/Edge/Brave (Chromium browsers)
- **macOS Safari**: Not supported (needs conversion)
- **Complex math**: May struggle with equations/formulas

---

## 🛡️ Troubleshooting

### "No valid API key" error
- Check line 150 in `background.js`
- Ensure API key starts with `sk-proj-` or `sk-`
- Verify key is active on OpenAI platform

### No answer appears
- Wait 3-5 seconds for processing
- Check if selection area was large enough (>30x30px)
- Look in bottom-right corner (answer is very subtle)
- Open DevTools Console (F12) and check for error messages

### Selection doesn't work
- Try reloading the page
- Click extension icon to reactivate
- Check if extension is enabled in `chrome://extensions/`

---

## 📋 Compatibility

### ✅ Supported Browsers
- Chrome (Windows, macOS, Linux)
- Microsoft Edge
- Brave
- Opera
- Arc
- Any Chromium-based browser

### ❌ Not Supported
- Safari (requires Safari Web Extension conversion)
- Firefox (partial compatibility, not tested)
- Mobile browsers (iOS/Android)

---

## 🤝 Contributing

This is a personal tool, but suggestions are welcome! Feel free to:
- Report bugs via Issues
- Suggest improvements
- Fork and customize for your needs

---

## ⚖️ Legal Disclaimer

**For educational purposes only.**

This tool uses AI to assist with information lookup. Users are responsible for:
- Complying with their institution's academic integrity policies
- Following terms of service of websites they use
- Using the tool ethically and responsibly

The developer assumes no liability for misuse.


## 🔗 Resources

- [OpenAI API Keys](https://platform.openai.com/api-keys)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Chrome Extension Development](https://developer.chrome.com/docs/extensions/mv3/)
- [GPT-4 Vision Guide](https://platform.openai.com/docs/guides/vision)

---

**Built with respect**
