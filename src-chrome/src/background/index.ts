/// <reference types="chrome"/>

console.log('ArtGrid Extension Background Service Worker Initialized');

chrome.runtime.onInstalled.addListener(() => {
  console.log('ArtGrid Extension Installed');
});

chrome.runtime.onMessage.addListener((message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  if (message.type === 'SAVE_IMAGE') {
    console.log('Received request to save image:', message.payload);
    
    fetch('http://localhost:1430/api/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message.payload),
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        sendResponse({ success: true });
      })
      .catch((err) => {
        console.error('ArtGrid save error in background:', err);
        sendResponse({ success: false, error: err.toString() });
      });
      
    // Return true to indicate we will send a response asynchronously
    return true; 
  }
  
  if (message.type === 'GET_SAVED_PINS') {
    fetch('http://localhost:1430/api/saved-pins')
      .then(res => res.json())
      .then(data => sendResponse({ success: true, savedPins: data }))
      .catch(err => {
        console.error('Failed to fetch saved pins:', err);
        sendResponse({ success: false, savedPins: [] });
      });
    return true;
  }
  if (message.type === 'BATCH_SAVE_IMAGE') {
    fetch('http://localhost:1430/api/ingest/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message.payload),
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        sendResponse({ success: true });
      })
      .catch((err) => {
        console.error('ArtGrid batch save error in background:', err);
        sendResponse({ success: false, error: err.toString() });
      });
      
    return true; 
  }
  
  return false;
});
