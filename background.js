let isSnipperActive = false;

console.log("🔧 Background: OpenRouter Vision service worker started");

chrome.commands.onCommand.addListener((command) => {
  console.log("🔧 Background: Command received:", command);
  if (command === 'activate_snipper') {
    toggleSnipper();
  }
});

chrome.action.onClicked.addListener((tab) => {
  console.log("🔧 Background: Icon clicked");
  toggleSnipper();
});

function toggleSnipper() {
  console.log("🔧 Background: Toggle snipper, current state:", isSnipperActive);
  if (isSnipperActive) {
    deactivateSnipper();
  } else {
    activateSnipper();
  }
}

function activateSnipper() {
  console.log("🔧 Background: Activating snipper...");
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) {
      console.error("🔧 Background: No active tab");
      return;
    }
    
    console.log("🔧 Background: Injecting snipper.js into tab:", tabs[0].id);
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      files: ['snipper.js']
    }, () => {
      if (chrome.runtime.lastError) {
        console.error("🔧 Background: Script injection failed:", chrome.runtime.lastError);
        return;
      }
      
      console.log("🔧 Background: Sending activation message");
      chrome.tabs.sendMessage(tabs[0].id, { action: 'activateSnipper' });
      isSnipperActive = true;
    });
  });
}

function deactivateSnipper() {
  console.log("🔧 Background: Deactivating snipper...");
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { action: 'deactivateSnipper' });
    isSnipperActive = false;
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("🔧 Background: ===== NEW MESSAGE =====");
  console.log("🔧 Background: Action:", request.action);
  
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
    
    analyzeWithVision(request.screenshotDataUrl)
      .then(answer => {
        console.log("🔧 Background: ===== SUCCESS =====");
        console.log("🔧 Background: ✅ Final answer:", answer);
        
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs[0]) return;
          console.log("🔧 Background: Sending result to tab:", tabs[0].id);
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'showResult',
            answer: answer
          });
        });
      })
      .catch(error => {
        console.error("🔧 Background: ===== ERROR =====");
        console.error("🔧 Background: ❌ Error:", error);
        
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs[0]) return;
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'showResult', 
            answer: `Error: ${error.message}`
          });
        });
      });
      
    return true;
  }
});

// Обрезка изображения через content script
async function cropImage(dataUrl, cropArea) {
  console.log("🔧 Background: Sending to content script for cropping");
  
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        resolve(dataUrl);
        return;
      }
      
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

// OPENROUTER VISION ANALYSIS (FREE!)
async function analyzeWithVision(screenshotDataUrl) {
  console.log("🔧 Background: =============================");
  console.log("🔧 Background: OPENROUTER VISION ANALYSIS");
  console.log("🔧 Background: =============================");
  
  // OpenRouter API ключ
  const apiKey = "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";
  
  console.log("🔧 Background: ✅ Using OpenRouter API");

  // Конвертируем base64
  const base64Image = screenshotDataUrl.replace(/^data:image\/\w+;base64,/, '');
  console.log("🔧 Background: Base64 image length:", base64Image.length);
  
  // Список бесплатных vision моделей для перебора
  const modelsToTry = [
    "openrouter/bert-nebulon-alpha",
    "google/gemini-2.0-flash-exp:free",
    "google/gemini-flash-1.5-8b:free",
    "qwen/qwen-2-vl-7b-instruct:free",
    "meta-llama/llama-3.2-11b-vision-instruct:free",
    "openai/gpt-4o-mini:free"
  ];
  
  let lastError = null;
  
  for (const modelName of modelsToTry) {
    try {
      console.log(`🔧 Background: Trying model: ${modelName}`);
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://github.com/test-helper',
          'X-Title': 'Test Helper Extension'
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `You are a test helper. Look at this test question image and:
1. Extract the question text
2. Extract all answer options
3. Determine the correct answer

Reply ONLY with the correct answer in the SHORTEST form possible:
- If options are A, B, C, D → reply just "A" or "B" etc.
- If text options → reply with the exact option text
- If True/False → reply "True" or "False"
- If Yes/No → reply "Yes" or "No"

DO NOT add any explanation or preamble. Just the answer.`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/png;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          max_tokens: 50,
          temperature: 0.1
        })
      });

      console.log(`🔧 Background: Response status: ${response.status}`);

      if (!response.ok) {
        const error = await response.json();
        console.log(`🔧 Background: ⚠️ Model ${modelName} failed:`, error.error?.message);
        lastError = error;
        continue; // Пробуем следующую модель
      }

      const data = await response.json();
      console.log("🔧 Background: ✅ SUCCESS with model:", modelName);
      console.log("🔧 Background: Full response:", data);
      
      const answer = data.choices?.[0]?.message?.content?.trim();
      
      console.log("🔧 Background: =============================");
      console.log("🔧 Background: FINAL ANSWER:");
      console.log("🔧 Background: =============================");
      console.log(answer);
      console.log("🔧 Background: =============================");
      
      if (!answer) {
        console.log("🔧 Background: ⚠️ Empty answer, trying next model");
        continue;
      }
      
      return answer;
      
    } catch (error) {
      console.log(`🔧 Background: ⚠️ Model ${modelName} error:`, error.message);
      lastError = error;
      continue;
    }
  }
  
  // Если ни одна модель не сработала
  console.error("🔧 Background: ❌ All models failed");
  throw new Error(`OpenRouter failed: ${lastError?.error?.message || 'All models unavailable'}`);
}