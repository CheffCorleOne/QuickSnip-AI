console.log("🎯 Snipper: Stealth mode loaded");

// check if alreaedy loaded
if (window.snipperLoaded) {
  console.log("🎯 Snipper: Already loaded, skipping");
} else {
  window.snipperLoaded = true;
  
let snipperActive = false;
let overlay = null;
let selectionRect = null;
let startX, startY;

function initSnipper() {
  console.log("🎯 Snipper: Activating stealth mode...");
  if (snipperActive) return;
  
  createOverlay();
  addEventListeners();
  snipperActive = true;
}

function createOverlay() {
  overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.001);
    cursor: crosshair;
    z-index: 10000;
  `;
  document.body.appendChild(overlay);
}

function addEventListeners() {
  overlay.addEventListener('mousedown', startSelection);
  overlay.addEventListener('contextmenu', cancelSelection);
  document.addEventListener('keydown', handleKeyPress);
}

function startSelection(e) {
  if (e.button !== 0) return;
  
  startX = e.clientX;
  startY = e.clientY;
  
  selectionRect = document.createElement('div');
  selectionRect.style.cssText = `
    position: fixed;
    border: 1px solid rgba(200, 200, 200, 0.15);
    background: rgba(220, 220, 220, 0.02);
    pointer-events: none;
    z-index: 10001;
  `;
  
  overlay.appendChild(selectionRect);
  overlay.addEventListener('mousemove', updateSelection);
  overlay.addEventListener('mouseup', endSelection);
}

function updateSelection(e) {
  const currentX = e.clientX;
  const currentY = e.clientY;
  
  const left = Math.min(startX, currentX);
  const top = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);
  
  selectionRect.style.left = left + 'px';
  selectionRect.style.top = top + 'px';
  selectionRect.style.width = width + 'px';
  selectionRect.style.height = height + 'px';
}

function endSelection(e) {
  overlay.removeEventListener('mousemove', updateSelection);
  overlay.removeEventListener('mouseup', endSelection);
  
  const endX = e.clientX;
  const endY = e.clientY;
  
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);
  
  console.log("🎯 Snipper: Selection area:", { left, top, width, height });
  
  if (width > 30 && height > 30) {
    console.log("🎯 Snipper: ✅ Area OK, starting capture");
    // no overlay no indicators
    cleanup();
    captureAreaAndProcess(left, top, width, height);
  } else {
    console.log("🎯 Snipper: ❌ Area too small");
    cleanup();
  }
}

function captureAreaAndProcess(left, top, width, height) {
  console.log("🎯 Snipper: ===== CAPTURE STARTING =====");
  console.log("🎯 Snipper: Area:", { left, top, width, height });
  
  // capture without indicator
  chrome.runtime.sendMessage({ 
    action: 'captureVisibleTab',
    cropArea: { left, top, width, height }
  }, (response) => {
    console.log("🎯 Snipper: Capture response:", response);
    
    if (response.error) {
      console.error("🎯 Snipper: ❌ Capture failed:", response.error);
    } else if (response.screenshotDataUrl) {
      console.log("🎯 Snipper: ✅ Screenshot ready, length:", response.screenshotDataUrl.length);
      processScreenshot(response.screenshotDataUrl);
    } else {
      console.error("🎯 Snipper: ❌ No screenshot in response");
    }
  });
}

function processScreenshot(screenshotDataUrl) {
  console.log("🎯 Snipper: ===== PROCESSING =====");
  console.log("🎯 Snipper: Sending to background for OCR + AI");
  
  chrome.runtime.sendMessage({
    action: 'analyzeScreenshot',
    screenshotDataUrl: screenshotDataUrl
  });
  
  console.log("🎯 Snipper: Message sent, waiting for result...");
}

function showStealthAnswer(answer) {
  console.log("🎯 Snipper: ===== SHOWING ANSWER =====");
  console.log("🎯 Answer:", answer);
  
  // makes it almost invisble in white background
  const popup = document.createElement('div');
  popup.id = 'stealth-answer';
  popup.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(255, 255, 255, 0.85);
    color: rgba(200, 200, 200, 0.7);
    padding: 6px 10px;
    border-radius: 3px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    font-size: 11px;
    font-weight: normal;
    z-index: 999999;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    max-width: 180px;
    cursor: pointer;
    border: 1px solid rgba(220, 220, 220, 0.4);
    opacity: 0.6;
    transition: opacity 0.2s;
  `;
  popup.textContent = answer;
  
  // mouse hover makes it more visible
  popup.addEventListener('mouseenter', () => {
    popup.style.opacity = '0.9';
    popup.style.color = 'rgba(150, 150, 150, 0.9)';
  });
  
  popup.addEventListener('mouseleave', () => {
    popup.style.opacity = '0.6';
    popup.style.color = 'rgba(200, 200, 200, 0.7)';
  });
  
  popup.addEventListener('click', () => {
    console.log("🎯 Snipper: Popup clicked, removing");
    popup.remove();
  });
  
  document.body.appendChild(popup);
  console.log("🎯 Snipper: ✅ Popup added to page");
  
  // autodelete popup in 4 sec
  setTimeout(() => {
    if (popup.parentNode) {
      console.log("🎯 Snipper: Auto-removing popup");
      popup.remove();
    }
  }, 4000);
}

function handleKeyPress(e) {
  if (e.key === 'Escape') cleanup();
}

function cancelSelection(e) {
  e.preventDefault();
  cleanup();
}

function cleanup() {
  if (overlay) overlay.remove();
  if (selectionRect) selectionRect.remove();
  document.removeEventListener('keydown', handleKeyPress);
  snipperActive = false;
  chrome.runtime.sendMessage({ action: 'snipperDeactivated' });
}

// message processor
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("🎯 Snipper: ===== MESSAGE RECEIVED =====");
  console.log("🎯 Snipper: Action:", request.action);
  console.log("🎯 Snipper: Full request:", request);
  
  if (request.action === 'activateSnipper') {
    console.log("🎯 Snipper: Activating...");
    initSnipper();
  } else if (request.action === 'deactivateSnipper') {
    console.log("🎯 Snipper: Deactivating...");
    cleanup();
  } else if (request.action === 'showResult') {
    console.log("🎯 Snipper: Showing result:", request.answer);
    showStealthAnswer(request.answer);
  } else if (request.action === 'cropImage') {
    console.log("🎯 Snipper: Cropping image...");
    cropImageInPage(request.dataUrl, request.cropArea).then(croppedDataUrl => {
      sendResponse({ croppedDataUrl: croppedDataUrl });
    });
    return true; // async response
  }
});

// framing area
async function cropImageInPage(dataUrl, cropArea) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = cropArea.width;
      canvas.height = cropArea.height;
      const ctx = canvas.getContext('2d');
      
      ctx.drawImage(
        img,
        cropArea.left, cropArea.top, cropArea.width, cropArea.height,
        0, 0, cropArea.width, cropArea.height
      );
      
      const croppedDataUrl = canvas.toDataURL('image/png');
      console.log("🎯 Snipper: ✅ Image cropped, length:", croppedDataUrl.length);
      resolve(croppedDataUrl);
    };
    img.src = dataUrl;
  });
}


} // end if (window.snipperLoaded)
