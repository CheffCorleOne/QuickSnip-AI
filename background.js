let isSnipperActive = false;

console.log("🔧 Background: OCR service worker started");

chrome.commands.onCommand.addListener((command) => {
  if (command === 'activate_snipper') {
    toggleSnipper();
  }
});

chrome.action.onClicked.addListener((tab) => {
  toggleSnipper();
});

function toggleSnipper() {
  if (isSnipperActive) {
    deactivateSnipper();
  } else {
    activateSnipper();
  }
}

function activateSnipper() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      files: ['snipper.js']
    }, () => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'activateSnipper' });
      isSnipperActive = true;
    });
  });
}

function deactivateSnipper() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'deactivateSnipper' });
    isSnipperActive = false;
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("🔧 Background: ===== NEW MESSAGE =====");
  console.log("🔧 Background: Action:", request.action);
  console.log("🔧 Background: Full request:", request);
  
  if (request.action === 'snipperDeactivated') {
    isSnipperActive = false;
  }
  
  if (request.action === 'captureVisibleTab') {
    console.log("🔧 Background: ===== CAPTURE START =====");
    console.log("🔧 Background: Crop area:", request.cropArea);
    
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, async (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error("🔧 Background: ❌ CAPTURE FAILED:", chrome.runtime.lastError);
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        console.log("🔧 Background: ✅ Capture OK, dataUrl length:", dataUrl.length);
        
        // Обрезаем если нужно
        if (request.cropArea) {
          console.log("🔧 Background: Cropping image...");
          const cropped = await cropImage(dataUrl, request.cropArea);
          console.log("🔧 Background: ✅ Cropped, length:", cropped.length);
          sendResponse({ screenshotDataUrl: cropped });
        } else {
          sendResponse({ screenshotDataUrl: dataUrl });
        }
      }
    });
    return true;
  }
  
  if (request.action === 'analyzeScreenshot') {
    console.log("🔧 Background: ===== ANALYZE START =====");
    console.log("🔧 Background: Screenshot length:", request.screenshotDataUrl?.length);
    
    analyzeWithOCR(request.screenshotDataUrl)
      .then(answer => {
        console.log("🔧 Background: ===== SUCCESS =====");
        console.log("🔧 Background: ✅ Final answer:", answer);
        
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          console.log("🔧 Background: Sending to tab:", tabs[0].id);
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'showResult',
            answer: answer
          });
        });
      })
      .catch(error => {
        console.error("🔧 Background: ===== ERROR =====");
        console.error("🔧 Background: ❌ Error:", error);
        console.error("🔧 Background: ❌ Stack:", error.stack);
        
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'showResult', 
            answer: `Error: ${error.message}`
          });
        });
      });
      
    return true;
  }
});

// cropping and sending
async function cropImage(dataUrl, cropArea) {
  console.log("🔧 Background: Sending to content script for cropping");
  
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'cropImage',
        dataUrl: dataUrl,
        cropArea: cropArea
      }, (response) => {
        if (response && response.croppedDataUrl) {
          console.log("🔧 Background: ✅ Cropped image received");
          resolve(response.croppedDataUrl);
        } else {
          console.log("🔧 Background: ⚠️ Cropping failed, using full image");
          resolve(dataUrl);
        }
      });
    });
  });
}

// OCR + AI analys
async function analyzeWithOCR(screenshotDataUrl) {
  console.log("🔧 Background: =============================");
  console.log("🔧 Background: STEP 1: OCR EXTRACTION");
  console.log("🔧 Background: =============================");
  
  // getiing API key
  console.log("🔧 Background: Getting API key from storage...");
  const result = await chrome.storage.sync.get(['openaiApiKey']);
  let apiKey = result.openaiApiKey;
  
  console.log("🔧 Background: Storage API key:", apiKey ? `${apiKey.substring(0, 10)}...` : "NOT FOUND");
  
  // no storage -< harcoded. Can be used for external env files by changing the code itself
  if (!apiKey || apiKey.includes("your-openai-key")) {
    console.log("🔧 Background: Using hardcoded key from config...");
    // HARDCODED KEY - insert directly!
    apiKey = "PASTE YOUR API HERE";
    console.log("🔧 Background: Hardcoded API key:", apiKey ? `${apiKey.substring(0, 10)}...` : "NOT SET");
  }
  
  if (!apiKey || apiKey.includes("your-openai-key") || apiKey.length < 20) {
    console.error("🔧 Background: ❌ NO VALID API KEY");
    throw new Error('OpenAI API key not configured. Edit background.js line 145');
  }

  console.log("🔧 Background: ✅ API key OK");

  // convert to base64
  const base64Image = screenshotDataUrl.replace(/^data:image\/\w+;base64,/, '');
  console.log("🔧 Background: Base64 image length:", base64Image.length);
  
  //GPT-4 vision for text analysys
  console.log("🔧 Background: Calling OpenAI API for OCR...");
  console.log("🔧 Background: Model: gpt-4o-mini");
  
  const ocrResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user", 
          content: [
            {
              type: "text",
              text: "Extract ALL text from this image exactly as it appears. Return only the extracted text, nothing else."
            },
            {
              type: "image_url",
              image_url: { url: `data:image/png;base64,${base64Image}` }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0
    })
  });

  console.log("🔧 Background: OCR Response status:", ocrResponse.status);
  console.log("🔧 Background: OCR Response OK:", ocrResponse.ok);

  if (!ocrResponse.ok) {
    const error = await ocrResponse.json();
    console.error("🔧 Background: ❌ OCR API Error:", error);
    throw new Error(`OCR failed: ${error.error?.message || ocrResponse.status}`);
  }

  const ocrData = await ocrResponse.json();
  console.log("🔧 Background: ✅ OCR Response received");
  console.log("🔧 Background: OCR Full response:", ocrData);
  
  const extractedText = ocrData.choices[0]?.message?.content?.trim();
  
  console.log("🔧 Background: =============================");
  console.log("🔧 Background: EXTRACTED TEXT:");
  console.log("🔧 Background: =============================");
  console.log(extractedText);
  console.log("🔧 Background: =============================");
  
  if (!extractedText || extractedText.length < 10) {
    throw new Error('No text extracted from image');
  }

  // Step - question analysis and respond
  console.log("🔧 Background: =============================");
  console.log("🔧 Background: STEP 2: GET ANSWER");
  console.log("🔧 Background: =============================");
  
  const answerResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a test helper. Analyze the question and answer options.
Reply ONLY with the correct answer in the shortest form possible.
Examples:
- If options are A, B, C, D → reply "A" or "B" etc.
- If text options → reply with exact option text
- If True/False → reply "True" or "False"
- If Yes/No → reply "Yes" or "No"
DO NOT add any explanation, just the answer.`
        },
        {
          role: "user", 
          content: `Question from test:\n\n${extractedText}\n\nWhat is the correct answer?`
        }
      ],
      max_tokens: 50,
      temperature: 0.1
    })
  });

  console.log("🔧 Background: Answer Response status:", answerResponse.status);
  console.log("🔧 Background: Answer Response OK:", answerResponse.ok);

  if (!answerResponse.ok) {
    const error = await answerResponse.json();
    console.error("🔧 Background: ❌ Answer API Error:", error);
    throw new Error(`Answer failed: ${error.error?.message || answerResponse.status}`);
  }

  const answerData = await answerResponse.json();
  console.log("🔧 Background: ✅ Answer Response received");
  console.log("🔧 Background: Answer Full response:", answerData);
  
  const answer = answerData.choices[0]?.message?.content?.trim();
  
  console.log("🔧 Background: =============================");
  console.log("🔧 Background: FINAL ANSWER:");
  console.log("🔧 Background: =============================");
  console.log(answer);
  console.log("🔧 Background: =============================");
  
  return answer || "No answer";
}

