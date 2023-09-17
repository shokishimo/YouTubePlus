const States = Object.freeze({
  RESTRICTED: "restricted",
  DISABLED: "disabled",
  POPUP: "popup"
});

let pageState = States.RESTRICTED;

// Listens for active tab switching and updates tab status accordingly
chrome.tabs.onActivated.addListener(info => {
  if (info.tabId) {
    chrome.tabs.get(info.tabId, (tab) => updateTabStatus(tab));
  }
});

// Listens for any updates in a tab, such as URL changes, and updates tab status
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  updateTabStatus(tab);
  if (changeInfo.status === "complete") {
    // If the tab is a popup, send a message to the content script
    if (pageState === States.POPUP) {
      const urlParameters = new URLSearchParams(tab.url.split("?")[1]);

      chrome.tabs.sendMessage(tabId, {
        type: "NEW",
        videoId: urlParameters.get("v"),
      }, response => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
            console.warn("Background.js: Failed to send message:", lastError);
            return;
        }
      });
    }
  }
});

/**
 * Updates the tab status based on its URL.
 * If the tab URL includes "chrome://", it is marked as restricted.
 * If the tab URL does not include "youtube.com", it is marked as disabled."
 * Else, it is marked as popup.
 *
 * @param {Tab} tab - The tab object.
 */
function updateTabStatus(tab) {
  if (tab.url && tab.url.includes("chrome://")) {
    pageState = States.RESTRICTED;
  } else if (tab.url && tab.url.includes("youtube.com")) {
    pageState = States.POPUP;
  } else {
    pageState = States.DISABLED;
  }
  setIconAndPopup(pageState, tab.id);
}

// Listens for messages sent from content scripts and sets the popup accordingly
chrome.runtime.onMessage.addListener((message, sender) => {
  if (sender.tab) {
    if (pageState === States.RESTRICTED) {
      setIconAndPopup(States.RESTRICTED, sender.tab.id);
    } else {
      setIconAndPopup(message.state, sender.tab.id);
    }
  }
});

/**
 * Sets the icon and popup for the given tab ID based on the provided buildState.
 *
 * @param {string} buildState - The type of build, "restricted", "disabled", or "popup".
 * @param {number} tabId - The ID of the tab.
 */
function setIconAndPopup(buildState, tabId) {
  // chrome.action.setIcon({
  //   tabId: tabId,
  //   path: {
  //     '16': chrome.runtime.getURL(`icons/logo16.png`),
  //     '32': chrome.runtime.getURL(`icons/logo32.png`),
  //     '48': chrome.runtime.getURL(`icons/icon48.png`),
  //     '128': chrome.runtime.getURL(`icons/icon128.png`),
  //   }
  // });

  // Sets the popup for the extension based on buildState
  chrome.action.setPopup({
    tabId: tabId,
    popup: chrome.runtime.getURL(`/popups/${buildState}.html`)
  });
}