document.addEventListener('DOMContentLoaded', () => {

  // Elements - General
  const welcomeScreen = document.getElementById('welcome-screen');
  const mainInterface = document.getElementById('main-interface');
  const getStartedBtn = document.getElementById('get-started-btn');
  const backButton = document.getElementById('back-button');
  const homepage = document.getElementById('homepage');
  const featureCards = document.querySelectorAll('.feature-card');
  const featurePages = document.querySelectorAll('.feature-page');
  const refreshStatsBtn = document.getElementById('refresh-stats'); 
  const siteStatsList = document.getElementById('site-stats-list');
  // Elements - Site Blocker
  const addAllowedBtn = document.getElementById('add-allowed');
  const allowedListEl = document.getElementById('allowed-list');
  const siteUrlInput = document.getElementById('site-url');

  const siteBlockerToggle = document.getElementById('enable-site-blocker');

  // Elements - Pomodoro Timer
  const timerDisplay = document.getElementById('timer-display');
  const timerStartBtn = document.getElementById('timer-start');
  const timerPauseBtn = document.getElementById('timer-pause');
  const timerResetBtn = document.getElementById('timer-reset');
  const timerProgressBar = document.getElementById('timer-progress-bar');
  const timerPhaseEl = document.getElementById('timer-phase');
  const saveTimerSettingsBtn = document.getElementById('save-timer-settings');
  const saveButton = document.getElementById('save-focus-settings');
  // Get form elements (you'll need to use the correct IDs from your HTML)
  const intervalInput = document.getElementById('checkInterval');
  const notificationTextInput = document.getElementById('notificationText');
  const soundToggle = document.getElementById('soundEnabled');
  // Elements - Theme Cards
  const themeCards = document.querySelectorAll('.theme-card');
  // Elements - Minimize/Restore
  const minimizeButton = document.getElementById('minimize-button');
  const minimizedView = document.getElementById('minimized-view');
  const restoreButton = document.getElementById('restore-button');
  const minimizedTimer = document.getElementById('minimized-timer');
  const minimizedPhase = document.getElementById('minimized-phase');
  const minimizedStartBtn = document.getElementById('minimized-start');
  const minimizedPauseBtn = document.getElementById('minimized-pause');
  const minimizedResetBtn = document.getElementById('minimized-reset');
  const todoInput = document.getElementById('todo-input');
  const addTodoBtn = document.getElementById('add-todo-btn');
  const todoItems = document.getElementById('todo-items');
  const clearCompletedBtn = document.getElementById('clear-completed-btn');
  // Pomodoro timer variables
  let workDuration = 25 * 60; // 25 minutes in seconds
  let breakDuration = 5 * 60;  // 5 minutes in seconds
  let longBreakDuration = 15 * 60; // 15 minutes in seconds
  let cyclesBeforeLongBreak = 4;
  let timer = null;
  let timeRemaining = workDuration;
  let isPaused = true;
  let isWorkPhase = true;
  let completedPomodoros = 0;
  let totalDuration = workDuration;
  //set the theme wooooooooooooo
  let currentTheme = 'default'; // Default theme
  // Welcome screen to main interface transition
  if (getStartedBtn) {
    getStartedBtn.addEventListener('click', () => {
      welcomeScreen.classList.add('hidden');
      mainInterface.classList.remove('hidden');
    });
  }
  if (refreshStatsBtn) {
    refreshStatsBtn.addEventListener('click', () => {
      loadSiteStats();
    });
    
    // Also load stats when the page is first shown
    document.querySelectorAll('.feature-card').forEach(card => {
      if (card.getAttribute('data-feature') === 'site-stats') {
        card.addEventListener('click', () => {
          loadSiteStats();
        });
      }
    });
  }
  // Back button functionality
  if (backButton) {
    backButton.addEventListener('click', () => {
      featurePages.forEach(page => page.classList.add('hidden'));
      homepage.classList.remove('hidden');
      backButton.classList.add('hidden');
    });
  }
  
  // Feature card navigation
  featureCards.forEach(card => {
    card.addEventListener('click', () => {
      const featureId = card.getAttribute('data-feature');
      homepage.classList.add('hidden');
      document.getElementById(featureId).classList.remove('hidden');
      backButton.classList.remove('hidden');
    });
  });
  
  // Site Blocker Functionality
  if (addAllowedBtn) {
    addAllowedBtn.addEventListener('click', () => {
      const siteUrl = siteUrlInput.value.trim();
      if (siteUrl) {
        chrome.runtime.sendMessage(
          { type: "addSite", site: siteUrl },
          (response) => {
            if (response && response.success) {
              updateAllowedList();
              siteUrlInput.value = '';
              alert(response.message);
            } else {
              alert(response && response.message ? response.message : "Failed to add site.");
            }
          }
        );
      } else {
        alert("Please enter a valid site URL.");
      }
    });
  }
  
  // Update the allowed list in the UI
  function updateAllowedList() {
    chrome.storage.local.get(['allowedSites'], (result) => {
      const allowedSites = result.allowedSites || [];
      if (allowedListEl) {
        allowedListEl.innerHTML = allowedSites.map(site => 
          `<li>${site} <button class="remove-site" data-site="${site}">Remove</button></li>`
        ).join('');
        setupRemoveButtons();
      }
    });
  }
  
  function loadSiteStats() {
    // Request stats from background script
    chrome.runtime.sendMessage({ type: "getSiteStats" }, (response) => {
      if (response && response.stats) {
        // Clear previous stats
        siteStatsList.innerHTML = '';
        
       // Get stats data
        const stats = response.stats;
        const date = response.date;
      
       // Create header
       const dateHeader = document.createElement('h3');
        dateHeader.textContent = `Statistics for ${date}`;
        siteStatsList.appendChild(dateHeader);
      
        // Sort sites by visit count (descending)
       const sortedSites = Object.keys(stats).sort((a, b) => stats[b] - stats[a]);
      
        if (sortedSites.length === 0) {
          const noStats = document.createElement('p');
          noStats.textContent = 'No site visits recorded today.';
          siteStatsList.appendChild(noStats);
        } else {
         // Create table for stats
         const table = document.createElement('table');
         table.className = 'stats-table';
         table.style.width = '100%';
         table.style.borderCollapse = 'collapse';
         table.style.marginTop = '10px';
        
         // Add table header
         const thead = document.createElement('thead');
         const headerRow = document.createElement('tr');
        
         const siteHeader = document.createElement('th');
         siteHeader.textContent = 'Site';
         siteHeader.style.textAlign = 'left';
         siteHeader.style.padding = '8px';
         siteHeader.style.borderBottom = '1px solid #ddd';
        
         const visitsHeader = document.createElement('th');
         visitsHeader.textContent = 'Visits';
         visitsHeader.style.textAlign = 'right';
         visitsHeader.style.padding = '8px';
         visitsHeader.style.borderBottom = '1px solid #ddd';
          
         headerRow.appendChild(siteHeader);
         headerRow.appendChild(visitsHeader);
         thead.appendChild(headerRow);
         table.appendChild(thead);
        
        // Create table body with stats
         const tbody = document.createElement('tbody');
        
        // Limit to top 10 sites for better UI
          const sitesToShow = sortedSites.slice(0, 10);
        
          sitesToShow.forEach(site => {
            const row = document.createElement('tr');
          
            const siteCell = document.createElement('td');
            siteCell.textContent = site;
            siteCell.style.padding = '8px';
            siteCell.style.borderBottom = '1px solid #eee';
          
            const visitsCell = document.createElement('td');
            visitsCell.textContent = stats[site];
            visitsCell.style.textAlign = 'right';
            visitsCell.style.padding = '8px';
            visitsCell.style.borderBottom = '1px solid #eee';
            
            row.appendChild(siteCell);
           row.appendChild(visitsCell);
            tbody.appendChild(row);
          });
        
          table.appendChild(tbody);
          siteStatsList.appendChild(table);
        
        // If there are more sites than we're showing
          if (sortedSites.length > 10) {
            const moreInfo = document.createElement('p');
            moreInfo.textContent = `+ ${sortedSites.length - 10} more sites`;
            moreInfo.style.textAlign = 'right';
            moreInfo.style.fontSize = '12px';
            moreInfo.style.color = '#666';
           moreInfo.style.marginTop = '5px';
            siteStatsList.appendChild(moreInfo);
         }
       }
     } else {
        siteStatsList.innerHTML = '<p>No statistics available. Try browsing some websites first.</p>';
      }
    });
  }
  // Remove site functionality
  function setupRemoveButtons() {
    document.querySelectorAll('.remove-site').forEach(button => {
      button.addEventListener('click', function() {
        const site = this.getAttribute('data-site');
        chrome.storage.local.get(['allowedSites'], (result) => {
          const allowedSites = result.allowedSites || [];
          const updatedSites = allowedSites.filter(s => s !== site);
          chrome.storage.local.set({ allowedSites: updatedSites }, () => {
            updateAllowedList();
            alert(`${site} has been removed from the allowed list.`);
          });
        });
      });
    });
  }

  // Initialize the allowed list on load
  updateAllowedList();
  // Load Pomodoro timer settings
  function loadTimerSettings() {
    chrome.storage.local.get(['pomodoroSettings'], (result) => {
      if (result.pomodoroSettings) {
        const settings = result.pomodoroSettings;
        document.getElementById('work-duration').value = settings.workMinutes || 25;
        document.getElementById('break-duration').value = settings.breakMinutes || 5;
        document.getElementById('long-break-duration').value = settings.longBreakMinutes || 15;
        document.getElementById('pomodoro-cycles').value = settings.cyclesBeforeLongBreak || 4;
        
        workDuration = (settings.workMinutes || 25) * 60;
        breakDuration = (settings.breakMinutes || 5) * 60;
        longBreakDuration = (settings.longBreakMinutes || 15) * 60;
        cyclesBeforeLongBreak = settings.cyclesBeforeLongBreak || 4;
        
        resetTimer();
      }
    });
  }
  
  // Save Pomodoro timer settings
  if (saveTimerSettingsBtn) {
    saveTimerSettingsBtn.addEventListener('click', () => {
      const workMinutes = parseInt(document.getElementById('work-duration').value) || 25;
      const breakMinutes = parseInt(document.getElementById('break-duration').value) || 5;
      const longBreakMinutes = parseInt(document.getElementById('long-break-duration').value) || 15;
      const cycles = parseInt(document.getElementById('pomodoro-cycles').value) || 4;
      
      const settings = {
        workMinutes,
        breakMinutes,
        longBreakMinutes,
        cyclesBeforeLongBreak: cycles
      };
      
      chrome.storage.local.set({ pomodoroSettings: settings }, () => {
        workDuration = workMinutes * 60;
        breakDuration = breakMinutes * 60;
        longBreakDuration = longBreakMinutes * 60;
        cyclesBeforeLongBreak = cycles;
        
        resetTimer();
        alert('Timer settings saved!');
      });
    });
  }
  
  // Format time for display (MM:SS)
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Update timer display and progress bar
  function updateTimerDisplay() {
    if (timerDisplay) {
      timerDisplay.textContent = formatTime(timeRemaining);
    }
    
    // Update progress bar
    if (timerProgressBar) {
      const percentage = ((totalDuration - timeRemaining) / totalDuration) * 100;
      timerProgressBar.style.width = `${percentage}%`;
    }
  }
  
  // Start the timer
  function startTimer() {
    if (isPaused) {
      isPaused = false;
      timerStartBtn.classList.add('hidden');
      timerPauseBtn.classList.remove('hidden');
      
      timer = setInterval(() => {
        if (timeRemaining > 0) {
          timeRemaining--;
          updateTimerDisplay();
        } else {
          // Timer completed
          clearInterval(timer);
          
          // Play notification sound
          const audio = new Audio(chrome.runtime.getURL('heymanthatsnotnice.wav'));
          audio.play().catch(e => console.log('Error playing sound:', e));
          
          // Show notification
          chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icon48.png'),
            title: isWorkPhase ? 'Break Time!' : 'Work Time!',
            message: isWorkPhase ? 'Great job! Take a break now.' : 'Break is over. Time to focus!',
            silent: false
          });
          
          // Switch phases
          if (isWorkPhase) {
            completedPomodoros++;
            isWorkPhase = false;
            
            // Determine if it's time for a long break
            if (completedPomodoros % cyclesBeforeLongBreak === 0) {
              totalDuration = longBreakDuration;
              timeRemaining = longBreakDuration;
              if (timerPhaseEl) timerPhaseEl.textContent = 'Long Break';
            } else {
              totalDuration = breakDuration;
              timeRemaining = breakDuration;
              if (timerPhaseEl) timerPhaseEl.textContent = 'Short Break';
            }
          } else {
            isWorkPhase = true;
            totalDuration = workDuration;
            timeRemaining = workDuration;
            if (timerPhaseEl) timerPhaseEl.textContent = 'Work Time';
          }
          
          updateTimerDisplay();
          isPaused = true;
          timerStartBtn.classList.remove('hidden');
          timerPauseBtn.classList.add('hidden');
        }
      }, 1000);
    }
  }
  
  // Pause the timer
  function pauseTimer() {
    if (!isPaused) {
      clearInterval(timer);
      isPaused = true;
      timerStartBtn.classList.remove('hidden');
      timerPauseBtn.classList.add('hidden');
    }
  }
  
  // Reset the timer
  function resetTimer() {
    clearInterval(timer);
    isPaused = true;
    isWorkPhase = true;
    completedPomodoros = 0;
    totalDuration = workDuration;
    timeRemaining = workDuration;
    
    if (timerPhaseEl) timerPhaseEl.textContent = 'Work Time';
    if (timerStartBtn) timerStartBtn.classList.remove('hidden');
    if (timerPauseBtn) timerPauseBtn.classList.add('hidden');
    
    updateTimerDisplay();
  }
  
  // Event listeners for timer controls
  if (timerStartBtn) {
    timerStartBtn.addEventListener('click', startTimer);
  }
  
  if (timerPauseBtn) {
    timerPauseBtn.addEventListener('click', pauseTimer);
  }
  
  if (timerResetBtn) {
    timerResetBtn.addEventListener('click', resetTimer);
  }
  
  // Initialize timer display
  updateTimerDisplay();
  
  // Load timer settings on popup open
  loadTimerSettings();
  

  saveButton.addEventListener('click', function() {
    // Get values from the form
    const interval = intervalInput.value;
    const notificationText = notificationTextInput.value;
    const soundEnabled = soundToggle.checked;
    
    // Validate interval (ensure it's a number and within reasonable bounds)
    const intervalMinutes = parseInt(interval);
    if (isNaN(intervalMinutes) || intervalMinutes < 1) {
      alert('Please enter a valid interval (minimum 1 minute)');
      return;
    }
    
    // Save settings to Chrome storage
    chrome.storage.sync.set({
      checkInterval: intervalMinutes,
      notificationText: notificationText || 'Are you still working?',
      soundEnabled: soundEnabled
    }, function() {
      // Provide feedback to the user
      const status = document.getElementById('status');
      status.textContent = 'Settings saved!';
      
      // Clear the status message after 2 seconds
      setTimeout(function() {
        status.textContent = '';
      }, 2000);
      
      // Set up the notification timer
      setupFocusChecker(intervalMinutes, notificationText, soundEnabled);
    });
  });
  
  // Load saved settings when popup opens
  loadSavedSettings();
  function loadSavedSettings() {
    chrome.storage.sync.get({
      // Default values
      checkInterval: 15,
      notificationText: 'Are you still working?',
      soundEnabled: true
    }, function(items) {
      // Populate the form with saved values
      document.getElementById('checkInterval').value = items.checkInterval;
      document.getElementById('notificationText').value = items.notificationText;
      document.getElementById('soundEnabled').checked = items.soundEnabled;
    });
  }
  
  // Set up the focus checker functionality
  function setupFocusChecker(interval, message, soundEnabled) {
    // Clear any existing alarms
    chrome.alarms.clear('focusCheckAlarm');
    
    // Create a new alarm that will fire at the specified interval
    chrome.alarms.create('focusCheckAlarm', {
      delayInMinutes: interval,
      periodInMinutes: interval
    });
    
    // Set up alarm listener in the background script
    chrome.runtime.sendMessage({
      action: 'setupAlarm',
      interval: interval,
      message: message,
      soundEnabled: soundEnabled
    });
  }
    // Add the missing function
  function adjustColor(hex, percent) {
      // Convert hex to RGB
    let r = parseInt(hex.substring(1, 3), 16);
    let g = parseInt(hex.substring(3, 5), 16);
    let b = parseInt(hex.substring(5, 7), 16);
  
    // Adjust brightness
      r = Math.floor(r * (100 + percent) / 100);
    g = Math.floor(g * (100 + percent) / 100);
    b = Math.floor(b * (100 + percent) / 100);

    // Make sure RGB values are within bounds
    r = (r < 255) ? r : 255;
    g = (g < 255) ? g : 255;
    b = (b < 255) ? b : 255;

    // Convert back to hex
    return "#" + 
           ((1 << 24) + (r << 16) + (g << 8) + b)
           .toString(16).slice(1);
  }

  // At the beginning of your DOMContentLoaded event handler
  if (siteBlockerToggle) {
    siteBlockerToggle.addEventListener('change', () => {
      const isEnabled = siteBlockerToggle.checked;
      chrome.storage.local.set({ siteBlockerEnabled: isEnabled }, () => {
        console.log(`Site blocker ${isEnabled ? 'enabled' : 'disabled'}`);
        
        // Create notification based on the new state
        chrome.notifications.create({
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icon48.png'),
          title: isEnabled ? 'Site Blocker Enabled' : 'Site Blocker Disabled',
          message: isEnabled ? 
            'The site blocker is now active. You can add sites to the allowed list.' : 
            'All sites will be accessible until you enable the site blocker again.',
          silent: false
        });
        
        // If you need to tell the background script about this change:
        chrome.runtime.sendMessage({ 
          type: "updateBlockerState", 
          enabled: isEnabled 
        });
      });
    });
  }
  // Minimize functionality
  if (minimizeButton) {
    minimizeButton.addEventListener('click', () => {
      mainInterface.classList.add('hidden');
      minimizedView.classList.remove('hidden');
      
      // Update minimized view with current timer state
      minimizedTimer.textContent = timerDisplay.textContent;
      minimizedPhase.textContent = timerPhaseEl.textContent;
      
      // Update button states to match
      if (isPaused) {
        minimizedStartBtn.classList.remove('hidden');
        minimizedPauseBtn.classList.add('hidden');
      } else {
        minimizedStartBtn.classList.add('hidden');
        minimizedPauseBtn.classList.remove('hidden');
      }
    });
  }
    // Restore functionality
    if (restoreButton) {
      restoreButton.addEventListener('click', () => {
        minimizedView.classList.add('hidden');
        mainInterface.classList.remove('hidden');
      });
    }

    // Minimized view controls
    if (minimizedStartBtn) {
      minimizedStartBtn.addEventListener('click', () => {
        startTimer();
        minimizedStartBtn.classList.add('hidden');
        minimizedPauseBtn.classList.remove('hidden');
      });
    }

    if (minimizedPauseBtn) {
      minimizedPauseBtn.addEventListener('click', () => {
        pauseTimer();
        minimizedPauseBtn.classList.add('hidden');
        minimizedStartBtn.classList.remove('hidden');
      });
    }

    if (minimizedResetBtn) {
      minimizedResetBtn.addEventListener('click', resetTimer);
    }

    // Modify updateTimerDisplay to also update minimized view
    function updateTimerDisplay() {
      if (timerDisplay) {
        timerDisplay.textContent = formatTime(timeRemaining);
      }
      
      // Also update minimized timer if it exists
      if (minimizedTimer) {
        minimizedTimer.textContent = formatTime(timeRemaining);
      }
      
      // Update progress bar
      if (timerProgressBar) {
        const percentage = ((totalDuration - timeRemaining) / totalDuration) * 100;
        timerProgressBar.style.width = `${percentage}%`;
      }

    }
  
    if (addTodoBtn) {
      addTodoBtn.addEventListener('click', addTodoItem);
      todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          addTodoItem();
        }
      });
    }
  
  if (clearCompletedBtn) {
    clearCompletedBtn.addEventListener('click', clearCompletedTasks);
  }
  document.querySelectorAll('.feature-card').forEach(card => {
    if (card.getAttribute('data-feature') === 'todo-list') {
      card.addEventListener('click', () => {
        loadTodoItems();
      });
    }
  });
  function addTodoItem() {
    const taskText = todoInput.value.trim();
    if (taskText) {
      chrome.storage.local.get(['todoItems'], (result) => {
        const todos = result.todoItems || [];
        const newTodo = {
          id: Date.now(), // Use timestamp as unique ID
          text: taskText,
          completed: false,
          createdAt: new Date().toISOString()
        };
        
        todos.push(newTodo);
        chrome.storage.local.set({ todoItems: todos }, () => {
          loadTodoItems(); // Refresh the list
          todoInput.value = ''; // Clear input
        });
      });
    }
  }
  // Function to load to-do items from storage
function loadTodoItems() {
  chrome.storage.local.get(['todoItems'], (result) => {
    const todos = result.todoItems || [];
    
    if (todoItems) {
      // Clear the current list
      todoItems.innerHTML = '';
      
      if (todos.length === 0) {
        // Show empty state
        todoItems.innerHTML = '<li class="empty-todo">No tasks yet. Add one above!</li>';
        return;
      }
      
      // Sort by creation date (newest first)
      todos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Create list items
      todos.forEach(todo => {
        const li = document.createElement('li');
        li.className = 'todo-item';
        if (todo.completed) {
          li.classList.add('completed');
        }
        
        // Add checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => toggleTodoComplete(todo.id, checkbox.checked));
        
        // Add task text
        const span = document.createElement('span');
        span.className = 'todo-text';
        span.textContent = todo.text;
        
        // Add delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-todo';
        deleteBtn.textContent = '✕';
        deleteBtn.addEventListener('click', () => deleteTodoItem(todo.id));
        
        // Assemble the item
        li.appendChild(checkbox);
        li.appendChild(span);
        li.appendChild(deleteBtn);
        todoItems.appendChild(li);
      });
    }
  });
}
  // Function to toggle the completed state of a to-do item
function toggleTodoComplete(id, completed) {
  chrome.storage.local.get(['todoItems'], (result) => {
    const todos = result.todoItems || [];
    const updatedTodos = todos.map(todo => {
      if (todo.id === id) {
        return { ...todo, completed };
      }
      return todo;
    });
    
    chrome.storage.local.set({ todoItems: updatedTodos }, () => {
      loadTodoItems(); // Refresh the list
    });
  });
}
function deleteTodoItem(id) {
  chrome.storage.local.get(['todoItems'], (result) => {
    const todos = result.todoItems || [];
    const updatedTodos = todos.filter(todo => todo.id !== id);
    
    chrome.storage.local.set({ todoItems: updatedTodos }, () => {
      loadTodoItems(); // Refresh the list
    });
  });
}
  // Function to clear all completed tasks
function clearCompletedTasks() {
  chrome.storage.local.get(['todoItems'], (result) => {
    const todos = result.todoItems || [];
    const remainingTodos = todos.filter(todo => !todo.completed);
    
    chrome.storage.local.set({ todoItems: remainingTodos }, () => {
      loadTodoItems(); // Refresh the list
    });
  });
}
});  
