(async () => {
  const States = Object.freeze({
    RESTRICTED: "restricted",
    DISABLED: "disabled",
    POPUP: "popup"
  });

  const timeOptions = [3, 5, 8, 10, 15, 20, 25, 30];
  let storedBackTimeObj = await chrome.storage.sync.get("timeToSkip");
  let timeToSkip = storedBackTimeObj.timeToSkip || timeOptions[1];

  window.addEventListener("DOMContentLoaded", () => {
    let currentURL = window.location.href;
    let state = "";
    
    if (currentURL.includes("youtube.com/")) {
      state = States.POPUP;
    } else {
      state = States.DISABLED;
    }
    handleNewVideoLoaded();
  
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
        handleNewVideoLoaded();
        break;
    }
  });
  
  
  const handleNewVideoLoaded = () => {
    const ytLeftControls = document.getElementsByClassName("ytp-left-controls")[0];
    const skipBackBtnExists = document.getElementsByClassName("skipBackBtn")[0];
    if (!skipBackBtnExists) {
      const skipBackBtn = document.createElement("img");
      skipBackBtn.src = chrome.runtime.getURL("assets/skipBackBtn.png");
      skipBackBtn.className = "skipBackBtn";
      skipBackBtn.title = "Click to rewind the viodeo";
  
      ytLeftControls.appendChild(skipBackBtn);
      skipBackBtn.addEventListener("click", addSkipBackEventHandler);
    }
    const skipForwardBtnExists = document.getElementsByClassName("skipForwardBtn")[0];
    if (!skipForwardBtnExists) {
      const skipForwardBtn = document.createElement("img");
      skipForwardBtn.src = chrome.runtime.getURL("assets/skipForwardBtn.png");
      skipForwardBtn.className = "skipForwardBtn";
      skipForwardBtn.title = "Click to skip forward the viodeo";
  
      ytLeftControls.appendChild(skipForwardBtn);
      skipForwardBtn.addEventListener("click", addSkipForwardEventHandler);
    }
    const settingLogoExists =  document.getElementsByClassName("settingLogo")[0];
    if (!settingLogoExists) {
      const settingLogo = document.createElement("img");
      settingLogo.src = chrome.runtime.getURL("assets/settingLogo.png");
      settingLogo.className = "settingLogo";
      settingLogo.title = "Click to set the amount of time (sec) to skip";
      ytLeftControls.appendChild(settingLogo);
      settingLogo.addEventListener("click", addSkipTimeSetting);
    }
    showVolumeDetail();
  };
  
  const addSkipBackEventHandler = () => {
    const videoElement1 = document.querySelector("video");
    if (videoElement1) {
      const newTime = videoElement1.currentTime - timeToSkip;
      videoElement1.currentTime = (newTime > 0) ? newTime : 0;
    }
  };

  const addSkipForwardEventHandler = () => {
    const videoElement2 = document.querySelector("video");
    if (videoElement2) {
      const newTime = videoElement2.currentTime + timeToSkip;
      const videoDuration = videoElement2.duration;
      if (videoDuration) {
        videoElement2.currentTime = (newTime < videoDuration) ? newTime : videoDuration;
      }
    }
  };

  const createContextMenu = () => {
    const contextMenu = document.createElement("div");
    contextMenu.id = "contextMenu";
    contextMenu.style.zIndex = "9999";
    contextMenu.style.display = "none";
    contextMenu.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    contextMenu.style.borderRadius = "5px";

    const title = document.createElement("div");
    title.innerText = "seconds";
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
          chrome.storage.sync.set({ "timeToSkip" : opt });
          timeToSkip = opt;
          contextMenu.style.display = "none";  // Hide the menu after selection
      });
      itemWrapper.appendChild(item);
      contextMenu.appendChild(itemWrapper);
    });

    return contextMenu;
  };

  const addSkipTimeSetting = (e) => {
    e.preventDefault(); // Prevent the default context menu from showing
    e.stopPropagation(); // Prevent the default context menu from showing

    // If the contextMenu already exists, we don't need to create it again
    let targetContextMenu = document.getElementById("contextMenu")
    if (targetContextMenu) {
      targetContextMenu.style.top = `${e.clientY - 200}px`;
      targetContextMenu.style.left = `${e.clientX + 30}px`;
      targetContextMenu.style.display = "block";
    } else {
      targetContextMenu = createContextMenu();
      targetContextMenu.style.position = "absolute";
      targetContextMenu.style.top = `${e.clientY - 200}px`;
      targetContextMenu.style.left = `${e.clientX + 30}px`;
      targetContextMenu.style.display = "block";
      document.body.appendChild(targetContextMenu);
    }

    // Listener to handle clicks (or right-click) outside the contextMenu
    document.addEventListener("click", makeContextMenuNone);
    document.addEventListener("contextmenu", makeContextMenuNone);

    function makeContextMenuNone() {
      const contextMenu = document.getElementById("contextMenu");
      if (contextMenu && contextMenu.style.display === "block") contextMenu.style.display = "none";
      document.removeEventListener("click", makeContextMenuNone);
      document.removeEventListener("contextmenu", makeContextMenuNone);
    };
  };

  const showVolumeDetail = () => {
    const video = document.querySelector("video");
    if (!video) {
      return;
    }
    let volumeDisplay = document.getElementById("volumeDisplay");
    if (!volumeDisplay) {
      volumeDisplay = document.createElement("div");
      volumeDisplay.id = "volumeDisplay";
      volumeDisplay.style.position = "absolute";
      volumeDisplay.style.padding = "2px";
      volumeDisplay.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
      volumeDisplay.style.color = "white";
      volumeDisplay.style.zIndex = "1000";
      volumeDisplay.style.fontSize = "12px";
      volumeDisplay.style.borderRadius = "5px";
      volumeDisplay.style.display = "block";
      document.body.appendChild(volumeDisplay);
    }

    const volumeMuteButton = document.getElementsByClassName("ytp-mute-button ytp-button")[0];
    const volumePanel = document.getElementsByClassName("ytp-volume-panel")[0];
    if (volumeMuteButton && volumePanel) {
        volumeMuteButton.addEventListener("mouseover", showVolumeSize);
        volumePanel.addEventListener("mouseover", showVolumeSize);
        function showVolumeSize() {
          const VolumeSizeEle = document.getElementsByClassName("ytp-volume-panel")[0];
          const rect = VolumeSizeEle.getBoundingClientRect();
          volumeDisplay.style.left = `${rect.left}px`;
          volumeDisplay.style.top = `${rect.bottom - 50}px`;
          volumeDisplay.innerHTML = `volume: ${VolumeSizeEle.ariaValueNow}%`;
          volumeDisplay.style.display = "block";
        }

        volumeMuteButton.addEventListener("mouseout", function() {
          volumeDisplay.style.display = "none";
        });
        volumePanel.addEventListener("mouseout", function() {
          volumeDisplay.style.display = "none";
        });
    }

    video.addEventListener("volumechange", function() {
      const volumePanel = document.getElementsByClassName("ytp-volume-panel")[0];
      volumeDisplay.innerHTML = `volume: ${volumePanel.ariaValueNow}%`;
      volumeDisplay.style.display = "block";
    });
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