(async () => {
  const States = Object.freeze({
    RESTRICTED: "restricted",
    DISABLED: "disabled",
    POPUP: "popup"
  });

  const timeOptions = [3, 5, 8, 10, 15, 20, 25, 30];
  let storedBackTimeObj = await chrome.storage.sync.get("timeToBack");
  let skipBackTime = storedBackTimeObj.timeToBack || timeOptions[1];
  let storedForwardTimeObj = await chrome.storage.sync.get("timeToFoward");
  let skipForwardTime = storedForwardTimeObj.timeToFoward || timeOptions[1];

  const createContextMenu = (isSkipBack) => {
    const contextMenu = document.createElement("div");
    contextMenu.id = (isSkipBack) ? "skipBackContextMenu" : "skipForwardContextMenu";
    contextMenu.style.zIndex = "9999";
    contextMenu.style.display = "none";
    contextMenu.style.backgroundColor = "rgba(0, 0, 0, 0.8)";

    const title = document.createElement("div");
    title.innerText = `seconds`;
    title.style.fontSize = "14px";
    title.style.color = "white";
    title.style.margin = "6px";
    contextMenu.appendChild(title);
    
    const line = document.createElement("div");
    line.style.height = "1px";
    line.style.backgroundColor = "white";
    contextMenu.appendChild(line);

    timeOptions.forEach((opt) => {
      const itemWrapper = document.createElement("div");
      itemWrapper.style.transition = "background-color 0.3s";
      itemWrapper.addEventListener("mouseover", () => {
        itemWrapper.style.backgroundColor = "grey";
      });
      itemWrapper.addEventListener("mouseout", () => {
        itemWrapper.style.backgroundColor = "transparent";
      });

      const item = document.createElement("div");
      item.innerText = `${opt}`;
      item.style.fontSize = "14px";
      item.style.color = "white";
      item.style.paddingTop = "4px";
      item.style.paddingBottom = "4px";
      item.style.paddingLeft = "10px";
      
      item.addEventListener("click", () => {
          // Store the selected skip time
          if (isSkipBack) {
            chrome.storage.sync.set({ "timeToBack" : opt });
            skipBackTime = opt;
          } else {
            chrome.storage.sync.set({ "timeToFoward" : opt });
            skipForwardTime = opt;
          }
          contextMenu.style.display = "none";  // Hide the menu after selection
      });
      itemWrapper.appendChild(item);
      contextMenu.appendChild(itemWrapper);
    });

    return contextMenu;
  };

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
    const settingLogo = document.createElement("img");
    settingLogo.src = chrome.runtime.getURL("assets/settingLogo.png");
    settingLogo.className = "settingLogo";
    settingLogo.title = "Click to set the amount of time (sec) to skip";
    ytLeftControls = document.getElementsByClassName("ytp-left-controls")[0];
    ytLeftControls.appendChild(settingLogo);
    settingLogo.addEventListener("click", addSkipTimeSetting);
  };
  
  const addSkipBackEventHandler = () => {
    const videoElement = document.querySelector("video");
    if (videoElement) {
      const newTime = videoElement.currentTime - skipBackTime;
      videoElement.currentTime = (newTime > 0) ? newTime : 0;
    }
  };

  const addSkipForwardEventHandler = () => {
    const videoElement = document.querySelector("video");
    if (videoElement) {
      const newTime = videoElement.currentTime + skipForwardTime;
      const videoDuration = videoElement.duration;
      if (videoDuration) {
        videoElement.currentTime = (newTime < videoDuration) ? newTime : videoDuration;
      }
    }
  };

  const addSkipTimeSetting = (e) => {
    e.preventDefault(); // Prevent the default context menu from showing
    e.stopPropagation(); // Prevent the default context menu from showing

    const targetContextMenuId = e.target.className.includes("skipBackBtn") ? 
      "skipBackContextMenu" : "skipForwardContextMenu";
    // If the contextMenu is already displayed, we don't need to create it again
    if (document.body.contains(document.getElementById(targetContextMenuId))) {
      const contentMenu = document.getElementById(targetContextMenuId);
      contentMenu.style.top = `${e.clientY}px`;
      contentMenu.style.left = `${e.clientX + 30}px`;
      contentMenu.style.display = "block";
      document.addEventListener("click", outsideClickListener);
      document.addEventListener("contextmenu", outsideClickListener);
    } else {
      const targetContextMenu = (targetContextMenuId === "skipBackContextMenu") ? 
        createContextMenu(true) : createContextMenu(false);
      targetContextMenu.style.position = "absolute";
      targetContextMenu.style.top = `${e.clientY}px`;
      targetContextMenu.style.left = `${e.clientX + 30}px`;
      targetContextMenu.style.display = "block";
      document.body.appendChild(targetContextMenu);
      // Listener to handle clicks (or right-click) outside the contextMenu
      document.addEventListener("click", outsideClickListener);
      document.addEventListener("contextmenu", outsideClickListener);
    }
  };

  function outsideClickListener(_event) {
    const skipbackCM = document.getElementById("skipBackContextMenu");
    const skipForwardCM = document.getElementById("skipForwardContextMenu");
    if (skipbackCM && skipbackCM.style.display === "block") skipbackCM.style.display = "none";
    if (skipForwardCM && skipForwardCM.style.display === "block") skipForwardCM.style.display = "none";
    document.removeEventListener("click", outsideClickListener);
    document.removeEventListener("contextmenu", outsideClickListener);
  };


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