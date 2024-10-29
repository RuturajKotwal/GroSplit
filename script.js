let items = [];

// Function to add an item to the list
function addItem() {
    const itemName = document.getElementById("itemName").value;
    const itemPrice = parseFloat(document.getElementById("itemPrice").value);
    const participants = Array.from(document.querySelectorAll(".participant:checked")).map(
        (checkbox) => checkbox.value
    );

    if (itemName && itemPrice && participants.length > 0) {
        items.push({ name: itemName, price: itemPrice, participants });
        displayItems();
        updateRemainingAmount();
    } else {
        alert("Please fill out all fields and select participants.");
    }

    // Clear inputs after adding
    document.getElementById("itemName").value = "";
    document.getElementById("itemPrice").value = "";
    document.querySelectorAll(".participant").forEach((checkbox) => (checkbox.checked = false));
    document.getElementById("selectAll").checked = false;
}

// Function to display items in the list
function displayItems() {
    const itemsList = document.getElementById("itemsList");
    itemsList.innerHTML = "";
    items.forEach((item, index) => {
        itemsList.innerHTML += `
            <li>
                ${item.name} - €${item.price.toFixed(2)} - [${item.participants.join(", ")}]
                <button onclick="removeItem(${index})">Remove</button>
            </li>
        `;
    });
}

// Function to remove an item by index and update the display and remaining amount
function removeItem(index) {
    items.splice(index, 1); // Remove item from the items array
    displayItems(); // Refresh the items display
    updateRemainingAmount(); // Recalculate remaining amount
}

// Function to update remaining amount based on items added
function updateRemainingAmount() {
    const totalAmount = parseFloat(document.getElementById("totalAmount").value) || 0;
    const totalItemsPrice = items.reduce((sum, item) => sum + item.price, 0);
    const remainingAmount = totalAmount - totalItemsPrice;

    document.getElementById("remainingAmount").textContent = remainingAmount.toFixed(2);

    if (remainingAmount < 0) {
        alert("The total of all items exceeds the total bill amount!");
    }
}

// Function to calculate and display split amounts
function calculateSplit() {
    const resultList = document.getElementById("resultList");
    resultList.innerHTML = "";

    // Initialize a map to hold each person's contribution
    const contributions = {};
    const totalAmount = parseFloat(document.getElementById("totalAmount").value) || 0;
    const totalItemsPrice = items.reduce((sum, item) => sum + item.price, 0);

    // Validation check
    if (totalItemsPrice > totalAmount) {
        alert("The items' total price exceeds the total bill. Please check the entries.");
        return;
    }

    items.forEach((item) => {
        const sharePerPerson = item.price / item.participants.length;
        item.participants.forEach((person) => {
            if (!contributions[person]) contributions[person] = 0;
            contributions[person] += sharePerPerson;
        });
    });

    // Display each person's total contribution
    for (const [person, amount] of Object.entries(contributions)) {
        resultList.innerHTML += `<li>${person}: €${amount.toFixed(2)}</li>`;
    }

    // Display remaining amount after calculation
    updateRemainingAmount();
}

// Function to select all participants for common items
function selectAllParticipants() {
    const selectAll = document.getElementById("selectAll").checked;
    document.querySelectorAll(".participant").forEach((checkbox) => {
        checkbox.checked = selectAll;
    });
}
