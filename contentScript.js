(() => {
  const States = Object.freeze({
    RESTRICTED: "restricted",
    DISABLED: "disabled",
    POPUP: "popup"
  });
  
  let currentVideo = ""; 

  window.addEventListener("DOMContentLoaded", () => {
    let currentURL = window.location.href;
    let state = "";
    
    if (currentURL.includes("youtube.com/")) {
      state = States.POPUP;
    } else {
      state = States.DISABLED;
    }
  
    chrome.runtime.sendMessage({ type: state }, response => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
          console.warn("contentScript.js: Failed to send message:", lastError);
          return;
      }
    });
  });
  
  chrome.runtime.onMessage.addListener((obj, sender, sendResponse) => {
    const { type, videoId } = obj;
    switch(type) {
      case "New":
        console.log("New received");
        currentVideo = videoId;
        handleNewVideoLoaded();
        break;
      default:
        break;
    }
  });
  
  
  const handleNewVideoLoaded = () => {
    const skipBackBtnExists = document.getElementsByClassName("skipBackBtn")[0];
    if (!skipBackBtnExists) {
      const skipBackBtn = document.createElement("img");
      skipBackBtn.src = chrome.runtime.getURL("assets/skipBackBtn.png");
      skipBackBtn.className = "skipBackBtn";
      skipBackBtn.title = "Click to rewind the viodeo";
  
      ytLeftControls = document.getElementsByClassName("ytp-left-controls")[0];
      ytLeftControls.appendChild(skipBackBtn);
      skipBackBtn.addEventListener("click", addSkipBackEventHandler);
    }
    const skipForwardBtnExists = document.getElementsByClassName("skipForwardBtn")[0];
    if (!skipForwardBtnExists) {
      const skipForwardBtn = document.createElement("img");
      skipForwardBtn.src = chrome.runtime.getURL("assets/skipForwardBtn.png");
      skipForwardBtn.className = "skipForwardBtn";
      skipForwardBtn.title = "Click to skip forward the viodeo";
  
      ytLeftControls = document.getElementsByClassName("ytp-left-controls")[0];
      ytLeftControls.appendChild(skipForwardBtn);
      skipForwardBtn.addEventListener("click", addSkipForwardEventHandler);
    }
  }
  
  const addSkipBackEventHandler = () => {
    const videoElement = document.querySelector("video");
    if (videoElement) {
      const newTime = videoElement.currentTime - 10;
      videoElement.currentTime = (newTime > 0) ? newTime : 0;
    }
  }

  const addSkipForwardEventHandler = () => {
    const videoElement = document.querySelector("video");
    if (videoElement) {
      const newTime = videoElement.currentTime + 10;
      const videoDuration = videoElement.duration;
      videoElement.currentTime = (newTime < videoDuration) ? newTime : videoDuration;
    }
  }


  // control the layout rendering of the page
  const observeControls = () => {
    const observerConfig = {
        childList: true,
        subtree: true
    };

    const callback = (mutationsList, observer) => {
      for (let mutation of mutationsList) {
        if (mutation.type === "childList" && document.getElementsByClassName("ytp-left-controls")[0]) {
          handleNewVideoLoaded();
          observer.disconnect(); // Disconnect observer once we've found our element
          break;
        }
      }
    };

    const observer = new MutationObserver(callback);
    observer.observe(document.body, observerConfig);
  };

  // Call the observeControls to initiate the observer
  observeControls();
})();