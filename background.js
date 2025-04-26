// Global cache for allowed sites
let allowedSitesCache = [];
const allowedTabs = new Map(); // Keeps track of allowed tabs and their hostnames
let siteBlockerEnabled = true; 
// Site statistics tracking
let siteStats = {};
let lastFocusCheckTime = 0;
let focusCheckEnabled = true;
let focusCheckInterval = 15; // Default 15 minutes
let focusMessage = "Are you staying focused?";


// Preload allowed sites and settings on extension startup
chrome.runtime.onStartup.addListener(() => {
  loadSettings();
});

// Also load settings when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  loadSettings();
});


function loadSettings() {
  // First get the site blocker enabled status
  chrome.storage.local.get(["siteBlockerEnabled"], (enabledResult) => {
    const isEnabled = enabledResult.siteBlockerEnabled !== undefined ? 
                      enabledResult.siteBlockerEnabled : true;
    
    if (!isEnabled) {
      // Skip blocking and allow all sites
      return;
    }
    
    // Then get the rest of the settings
    chrome.storage.local.get(["allowedSites", "siteStats", "focusCheckEnabled", "focusCheckInterval", "focusMessage"], (result) => {
      allowedSitesCache = result.allowedSites || [];
      siteStats = result.siteStats || {};
      focusCheckEnabled = result.focusCheckEnabled !== undefined ? result.focusCheckEnabled : true;
      focusCheckInterval = result.focusCheckInterval || 15;
      focusMessage = result.focusMessage || "Are you staying focused?";
      
      console.log("Settings loaded:", {
        allowedSites: allowedSitesCache,
        focusCheckEnabled,
        focusCheckInterval,
        focusMessage
      });
      
      // Start periodic focus checks if enabled
      if (focusCheckEnabled) {
        startFocusChecks();
      }
    });
  });
}



// Update settings cache whenever storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local") {
    if (changes.allowedSites) {
      allowedSitesCache = changes.allowedSites.newValue || [];
      console.log("Allowed sites cache updated:", allowedSitesCache);
    }
    
    if (changes.focusCheckEnabled) {
      focusCheckEnabled = changes.focusCheckEnabled.newValue;
      if (focusCheckEnabled) {
        startFocusChecks();
      }
      console.log("Focus check enabled:", focusCheckEnabled);
    }
    
    if (changes.focusCheckInterval) {
      focusCheckInterval = changes.focusCheckInterval.newValue;
      console.log("Focus check interval updated:", focusCheckInterval);
    }
    
    if (changes.focusMessage) {
      focusMessage = changes.focusMessage.newValue;
      console.log("Focus message updated:", focusMessage);
    }
  }
});

// Block navigation to sites not in the allowed list
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (!details.url) {
    console.log("Ignoring navigation with an invalid or empty URL.");
    return;
  }

  const url = new URL(details.url);
  
  // Check if this is a main frame navigation or an iframe/subframe
  const isMainFrame = details.frameId === 0;
  
  console.log(`Navigating to: ${url.hostname} (${isMainFrame ? 'main frame' : 'iframe/subframe'})`);

  // Always allow Google and its subdomains
  if (url.hostname.endsWith("google.com")) {
    console.log(`Allowing Google site for tab ${details.tabId}: ${url.hostname}`);
    if (isMainFrame) {
      allowedTabs.set(details.tabId, url.hostname);
      updateSiteStats(url.hostname); // Track site visit
    }
    return;
  }

  // Check if the site is in the allowed list
  const isAllowed = allowedSitesCache.some((site) =>
    url.hostname === site || url.hostname.endsWith(`.${site}`)
  );

  if (isAllowed) {
    console.log(`Allowing site for tab ${details.tabId}: ${url.hostname}`);
    if (isMainFrame) {
      allowedTabs.set(details.tabId, url.hostname);
      updateSiteStats(url.hostname); // Track site visit
    }
  } else {
    // For main frames, block the entire navigation
    if (isMainFrame) {
      console.log(`Blocking site for tab ${details.tabId}: ${url.hostname}`);
      chrome.tabs.update(details.tabId, { url: chrome.runtime.getURL("blocked.html") });
    } else {
      // For iframes, check if the parent tab is allowed
      chrome.tabs.get(details.tabId, (tab) => {
        if (tab && tab.url) {
          try {
            const parentUrl = new URL(tab.url);
            const parentIsAllowed = allowedSitesCache.some((site) =>
              parentUrl.hostname === site || parentUrl.hostname.endsWith(`.${site}`) || parentUrl.hostname.endsWith("google.com")
            );
            
            if (parentIsAllowed) {
              // If parent tab is allowed, allow the iframe content
              console.log(`Allowing embedded content from ${url.hostname} in allowed parent site ${parentUrl.hostname}`);
              return;
            } else {
              // If parent tab is not allowed (which shouldn't happen, but just in case),
              // block the iframe content
              console.log(`Blocking embedded content from ${url.hostname} in disallowed parent site ${parentUrl.hostname}`);
              // Note: You can't redirect iframe navigation, so we just log it
            }
          } catch (e) {
            console.error("Error parsing parent tab URL:", e);
          }
        }
      });
    }
  }
}, { url: [{ schemes: ["http", "https"] }] });

// Site checker functionality - Track tab focus time and site visits
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url && tab.url.startsWith("http")) {
      try {
        const url = new URL(tab.url);
        updateSiteStats(url.hostname);
      } catch (e) {
        console.error("Error parsing URL:", e);
      }
    }
  });
});

// Update site statistics
function updateSiteStats(hostname) {
  const today = new Date().toDateString();
  
  if (!siteStats[today]) {
    siteStats[today] = {};
  }
  
  if (!siteStats[today][hostname]) {
    siteStats[today][hostname] = 0;
  }
  
  siteStats[today][hostname]++;
  
  // Store updated stats
  chrome.storage.local.set({ siteStats });
  console.log(`Updated site stats for ${hostname}:`, siteStats[today][hostname]);
}

// Focus checker functionality
function startFocusChecks() {
  // Clear any existing interval
  stopFocusChecks();
  
  // Set interval for focus checks (convert minutes to milliseconds)
  setInterval(showFocusCheck, focusCheckInterval * 60 * 1000);
  console.log(`Focus checks started with interval of ${focusCheckInterval} minutes`);
}

function stopFocusChecks() {
  // Clear all intervals (this is a bit brute force but ensures no lingering intervals)
  for (let i = 1; i < 1000; i++) {
    window.clearInterval(i);
  }
}

function showFocusCheck() {
  if (!focusCheckEnabled) return;
  
  // Find the active tab to show the focus check
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) return;
    
    const activeTabId = tabs[0].tabId;
    
    // Show focus check notification
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon128.png",
      title: "Focus Check",
      message: focusMessage,
      buttons: [
        { title: "Yes, I'm focused" },
        { title: "No, I need a break" }
      ],
      requireInteraction: true
    });
    
    // Alternative: inject a modal into the page instead of a notification
    /*
    chrome.scripting.executeScript({
      target: { tabId: activeTabId },
      function: injectFocusCheckModal,
      args: [focusMessage]
    });
    */
  });
}

// Clean up allowed tabs when navigation or tab state changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading" && !allowedTabs.has(tabId)) {
    console.log(`Clearing allowed tab for tabId ${tabId}`);
    allowedTabs.delete(tabId);
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "addSite") {
    const newSite = message.site?.trim();
    if (newSite) {
      chrome.storage.local.get(["allowedSites"], (result) => {
        const allowedSites = result.allowedSites || [];
        if (!allowedSites.includes(newSite)) {
          allowedSites.push(newSite);
          chrome.storage.local.set({ allowedSites }, () => {
            console.log(`Added site to allowed list: ${newSite}`);
            sendResponse({ success: true, message: `Added site: ${newSite}` });
          });
        } else {
          console.log(`Site already in allowed list: ${newSite}`);
          sendResponse({ success: false, message: `${newSite} is already allowed.` });
        }
      });
    } else {
      sendResponse({ success: false, message: "No valid site provided." });
    }
    return true; // Indicate asynchronous response
  }
  
  // Handle focus check settings update
  else if (message.type === "updateFocusSettings") {
    chrome.storage.local.set({
      focusCheckEnabled: message.enabled,
      focusCheckInterval: message.interval,
      focusMessage: message.message
    }, () => {
      // Reload settings after update
      loadSettings();
      sendResponse({ success: true });
    });
    return true; // Indicate asynchronous response
  }
  
  // Handle site stats request
  else if (message.type === "getSiteStats") {
    const today = new Date().toDateString();
    sendResponse({ 
      stats: siteStats[today] || {},
      date: today
    });
    return false; // No asynchronous response needed
  }
});

// Handle focus check notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  // Close the notification
  chrome.notifications.clear(notificationId);
  
  if (buttonIndex === 1) {
    // User clicked "No, I need a break" - could redirect to a break page
    chrome.tabs.create({ url: chrome.runtime.getURL("break.html") });
  }
  // Button index 0 is "Yes, I'm focused" - no action needed
});