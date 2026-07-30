/// <reference types="chrome"/>

console.log('ArtGrid Extension Background Service Worker Initialized');

chrome.runtime.onInstalled.addListener(() => {
  console.log('ArtGrid Extension Installed');
});

chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  if (message.type === 'SAVE_IMAGE') {
    console.log('Received request to save image:', message.payload, sender);
    sendResponse({ success: true, message: 'Image queued for saving' });
  }
  return true; 
});
