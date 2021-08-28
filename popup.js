document.addEventListener("DOMContentLoaded", function() {
    const days = {0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday'};
    const addButton = document.getElementById('addButton');
    const scheduledItemsEl = document.getElementById('itemsList');
    const daySelector = document.getElementById('daySelector');

    var scheduledItems = [];
    const localStorageItems = localStorage.getItem('scheduledItems');
    var storageTest = chrome.storage.sync.get(['scheduledItems'], (result) => {
        console.log(result.scheduledItems);
    });
    if (localStorageItems) {
        scheduledItems = JSON.parse(localStorageItems);
    }

    // Default selected day is the current day
    currentDay = (new Date()).getDay();
    daySelector.selectedIndex = currentDay;
    renderItems(days[currentDay], scheduledItems);

    // Render items when switching between days
    daySelector.addEventListener('change', () => {
        renderItems(daySelector.value, scheduledItems);
    });

    // Add new scheduled item
    addButton.addEventListener('click', () => {
        const selectedDay = daySelector.value;

        // Setting default time to 30 minutes ahead of current date if first item (empty array),
        // otherwise, default time is 30 minutes ahead of previous time of the same day
        var defaultDate = new Date();
        var defaultTime = "";

        if (scheduledItems.length < 1) { // TODO (fix flaw): When switched to new day, starts off at previous time instead of current time
            defaultDate.setMinutes(defaultDate.getMinutes() + 30);
        } else {
            let previousTimeString = (scheduledItems[previousItem(selectedDay, scheduledItems)]).time.split(':');
            defaultDate.setHours(Number(previousTimeString[0]));
            defaultDate.setMinutes(Number(previousTimeString[1]) + 30);
        }
        defaultTime = `${twoDigits(defaultDate.getHours())}:${twoDigits(defaultDate.getMinutes())}`;

        // currentId = 0 if list is empty else id of item with highest id plus one
        currentId = scheduledItems.length < 1 ? 0 : Number(scheduledItems[findMaxIdIndex(scheduledItems)].id + 1);

        // Creating scheduled item and adding to scheduledItems array
        newItem = {
            'id': currentId,
            'day': selectedDay,
            'title': 'New Item',
            'time': defaultTime,
            'link': ''
        };
        scheduledItems.push(newItem);
        renderItems(selectedDay, scheduledItems);
    });

    // Edit or Delete a scheduled item
    scheduledItemsEl.addEventListener('click', (element) => {
        const elementTuple = element.target.id.split('-');
        const elementAction = elementTuple[0];
        const elementId = elementTuple[1];

        if (elementAction !== 'edit' 
        && elementAction !== 'delete' 
        && elementAction !== 'save') {
            return;
        }

        if (elementAction === 'edit') {
            editScheduledItem(elementId, scheduledItems);
            return;
        }

        if (elementAction === 'save') {
            saveScheduledItem(elementId, scheduledItems);
            return;
        }

        if (elementAction === 'delete') {
            deleteScheduledItem(elementId, scheduledItems);
            return;
        }
    });
});

function twoDigits(number) {
    return (number < 10 ? '0' : '') + number;
}

function renderItems(selectedDay, scheduledItems) {
    const scheduledItemsEl = document.getElementById('itemsList');
    scheduledItemsEl.innerHTML = "";

    localStorage.setItem('scheduledItems', JSON.stringify(scheduledItems));
    chrome.storage.sync.set({'scheduledItems': scheduledItems}, () => {
        console.log('Set Item ' + scheduledItems);
    });
    scheduledItems = sortedByDate(scheduledItems);

    for (let i = 0; i < scheduledItems.length; i++) {
        const scheduledItem = scheduledItems[i]

        if (scheduledItem.day !== selectedDay) {
            continue;
        }
        
        // Div element
        const newDiv = document.createElement('div');
        newDiv.id = `scheduledItem-${scheduledItem.id}`
        newDiv.classList.add('scheduledItem');

        newDiv.innerHTML = `
            <div class="info-area">
                <h2>${scheduledItem.title}</h2>
                <div class="linkArea">
                    <input type="text" value="${scheduledItem.link}" readonly>
                </div>
                <div class="timeArea">
                    <input type="time" value="${scheduledItem.time}" readonly>
                </div>
            </div>
            <div class="toolsArea">
                    <span class="material-icons" id="edit-${scheduledItem.id}">edit</span>
                    <span class="material-icons" id="delete-${scheduledItem.id}">delete</span>
            </div>
        `

        createAlarm(scheduledItem.id, scheduledItem.time, scheduledItem.day);
        scheduledItemsEl.appendChild(newDiv);
    }
}

function editScheduledItem(scheduledItemId, scheduledItems) {
    var indexOfScheduledItem = findIndexOf(scheduledItemId, scheduledItems);
    const scheduledItemEl = document.getElementById(`scheduledItem-${scheduledItemId}`);
    const scheduledItem = scheduledItems[indexOfScheduledItem];
    
    scheduledItemEl.innerHTML = `
        <div class="info-area">
        <input class="title-edit" type="text" id="title-${scheduledItem.id}" value="${scheduledItem.title}">
            <div class="linkArea-edit">
                <input type="text" id="link-${scheduledItem.id}" placeholder="Enter a meet link" value="${scheduledItem.link}">
            </div>
            <div class="timeArea-edit">
                <input type="time" id="time-${scheduledItem.id}" value="${scheduledItem.time}">
            </div>
        </div>
        <div class="toolsArea">
                <span class="material-icons" id="save-${scheduledItem.id}">save</span>
        </div>
    `
}

function saveScheduledItem(scheduledItemId, scheduledItems) {
    var indexOfScheduledItem = findIndexOf(scheduledItemId, scheduledItems);
    const editedTitle = document.getElementById(`title-${scheduledItemId}`).value;
    const editedTime = document.getElementById(`time-${scheduledItemId}`).value;
    const editedLink = document.getElementById(`link-${scheduledItemId}`).value;

    var scheduledItem = scheduledItems[indexOfScheduledItem];
    scheduledItem.title = editedTitle;
    scheduledItem.time = editedTime;
    scheduledItem.link = editedLink;
    renderItems(scheduledItem.day, scheduledItems);
}

function deleteScheduledItem(scheduledItemId, scheduledItems) {
    toDeleteItemIndex = findIndexOf(scheduledItemId, scheduledItems);
    var scheduledItem = scheduledItems[toDeleteItemIndex];

    if (toDeleteItemIndex > -1) {
        scheduledItems.splice(toDeleteItemIndex, 1);
        renderItems(scheduledItem.day, scheduledItems);
    }
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

function findMaxIdIndex(scheduledItems) {
    var maxId = [0, 0]; // tuple => [id, index]

    if (scheduledItems.length < 1) {
        return 0;
    }

    for(let i = 0; i < scheduledItems.length; i++) {
        var scheduledItem = scheduledItems[i];

        if (scheduledItem.id > maxId[0]) {
            maxId = [scheduledItem.id, i];
        }
    }

    return Number(maxId[1]); // returns index
}

function sortedByDate(scheduledItems) {
    sortedArray =  scheduledItems.sort(function (scheduledItemA, scheduledItemB) {
        let year = (new Date()).getFullYear();
        let month = (new Date()).getMonth();
        let day = (new Date()).getDate();
    
        let stringTimeA = (scheduledItemA.time).split(":");
        let hourA = Number(stringTimeA[0]);
        let minA = Number(stringTimeA[1]);
    
        let stringTimeB = (scheduledItemB.time).split(":");
        let hourB = Number(stringTimeB[0]);
        let minB = Number(stringTimeB[1]);
    
        let dateA = new Date(year, month, day, hourA, minA);
        let dateB = new Date(year, month, day, hourB, minB);
    
        return dateA - dateB;
    });

    return sortedArray;
}

function previousItem(day, scheduledItems) {
    var previousItem = [0, 0]; // tuple => [id, index]

    if (scheduledItems.length < 1) {
        return 0;
    }

    for(let i = 0; i < scheduledItems.length; i++) {
        var scheduledItem = scheduledItems[i];

        if (scheduledItem.day === day && scheduledItem.id > previousItem[0]) {
            previousItem = [scheduledItem.id, i];
        }
    }

    return Number(previousItem[1]); // returns index
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
