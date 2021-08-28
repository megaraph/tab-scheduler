// Add alarms when browser loads
chrome.runtime.onStartup.addListener(function () {
    chrome.storage.sync.get(['scheduledItems'], (result) => {
        scheduledItems = result.scheduledItems;
        console.log(`Running at ${new Date()}`);
        console.log(scheduledItems);
        chrome.alarms.clear()
        for (let i = 0; i < scheduledItems.length; i++) {
            scheduledItem = scheduledItems[i];
            createAlarm(scheduledItem.id, scheduledItem.time, scheduledItem.day);
        }
    });
});

// Listens to when an alarm happens
chrome.alarms.onAlarm.addListener(function (alarm) {
    // Get scheduledItems from Chrome local storage on alarm
    var scheduledItems = [];
    chrome.storage.sync.get(['scheduledItems'], (result) => {
        scheduledItems = result.scheduledItems
        const scheduledItemId = alarm.name.split('-')[1];
        console.log(alarm.name);
        console.log(scheduledItemId);
        scheduledItemLink = createNotification(scheduledItemId, scheduledItems);

        // Creates a new tab
        if (scheduledItemLink !== '') {
            chrome.tabs.create({
                url: scheduledItemLink
            });
        }
    });
})

function createNotification(scheduledItemId, scheduledItems) {
    var indexOfScheduledItem = findIndexOf(scheduledItemId, scheduledItems);
    var scheduledItem = scheduledItems[indexOfScheduledItem];

    var scheduledItemLink = (scheduledItem.link).length > 0 ? scheduledItem.link : '<no link provided>';
    var notifName = `item${scheduledItemId}Notif`
    var notification = {
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: `Notification for "${scheduledItem.title}"`,
        message: `"Don't miss out on ${scheduledItem.title}! Redirect link: '${scheduledItemLink}'`
    }
    chrome.notifications.create(notifName, notification);

    return scheduledItem.link;
}

function findIndexOf(scheduledItemId, scheduledItems) {
    var index = 0;
    for(let i = 0; i < scheduledItems.length; i++) {
        scheduledItem = scheduledItems[i]
        
        if (scheduledItem.id == scheduledItemId) {
            index = i;
            return index;
        }
    }

    return null;
}

function createAlarm(scheduledItemId, timeString, day) {
    const days = {0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday'};
    const now = new Date();
    const currentTime = now.getTime();

    // Don't continue if scheduledItem's day is not current day
    if (day !== days[now.getDay()]) {
        return;
    }

    var alarmId = `scheduledItem-${scheduledItemId}`;
    var timeTuple = timeString.split(':');

    var year = now.getFullYear();
    var month = now.getMonth();
    var day = now.getDate();
    var hour = timeTuple[0];
    var min = timeTuple[1];
    var alarmTime = new Date(year, month, day, hour, min);
    var whenToRing = alarmTime.getTime();

    // Don't create alarm if alarm time is already behind current time
    if ((currentTime - whenToRing) > 0) {
        return;
    }

    chrome.alarms.create(alarmId, {
        when: whenToRing
    });
}
