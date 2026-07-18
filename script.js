const API_BASE = 'http://localhost:5000/groups';

let currentGroup = null;

// Initialize group on page load
document.addEventListener('DOMContentLoaded', () => {
  initGroup();
});

async function initGroup() {
  let groupId = localStorage.getItem('grosplit_group_id');

  if (groupId) {
    try {
      const res = await fetch(`${API_BASE}/${groupId}`);
      if (res.ok) {
        currentGroup = await res.json();
      }
    } catch (err) {
      console.warn('Could not fetch stored group, creating default group.', err);
    }
  }

  // Create default group if none exists
  if (!currentGroup) {
    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Apartment 4B',
          members: ['Alice', 'Bob', 'Charlie', 'Dave'],
        }),
      });
      if (res.ok) {
        currentGroup = await res.json();
        localStorage.setItem('grosplit_group_id', currentGroup._id);
      }
    } catch (err) {
      console.error('Failed to initialize group with backend API:', err);
    }
  }

  if (currentGroup) {
    renderGroupUI();
    await displayItems();
    await calculateSplit();
  }
}

function renderGroupUI() {
  document.getElementById('groupNameDisplay').textContent = currentGroup.name;
  document.getElementById('groupIdDisplay').textContent = currentGroup._id;
  document.getElementById('membersDisplay').textContent = currentGroup.members.join(', ');

  // Populate Payer Select dropdown
  const payerSelect = document.getElementById('payerSelect');
  const settlementFrom = document.getElementById('settlementFrom');
  const settlementTo = document.getElementById('settlementTo');

  payerSelect.innerHTML = '<option value="">Select Payer</option>';
  settlementFrom.innerHTML = '<option value="">Select Payer</option>';
  settlementTo.innerHTML = '<option value="">Select Recipient</option>';

  currentGroup.members.forEach((member) => {
    payerSelect.innerHTML += `<option value="${member}">${member}</option>`;
    settlementFrom.innerHTML += `<option value="${member}">${member}</option>`;
    settlementTo.innerHTML += `<option value="${member}">${member}</option>`;
  });

  // Populate Participant Checkboxes
  const checkboxContainer = document.getElementById('participantsCheckboxContainer');
  checkboxContainer.innerHTML = '';
  currentGroup.members.forEach((member) => {
    checkboxContainer.innerHTML += `
      <label style="margin-right: 15px;">
        <input type="checkbox" value="${member}" class="participant" /> ${member}
      </label>
    `;
  });
}

// Function to add an expense via API
async function addExpense() {
  if (!currentGroup) {
    alert('No active group loaded.');
    return;
  }

  const paidBy = document.getElementById('payerSelect').value;
  const description = document.getElementById('itemName').value.trim();
  const priceEuro = parseFloat(document.getElementById('itemPrice').value);
  const participants = Array.from(
    document.querySelectorAll('.participant:checked')
  ).map((cb) => cb.value);

  if (!paidBy || !description || isNaN(priceEuro) || priceEuro <= 0 || participants.length === 0) {
    alert('Please select a payer, enter a description, enter a valid positive amount, and select at least one participant.');
    return;
  }

  const amountCents = Math.round(priceEuro * 100);

  try {
    const res = await fetch(`${API_BASE}/${currentGroup._id}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paidBy,
        amount: amountCents,
        description,
        splitBetween: participants,
      }),
    });

    if (!res.ok) {
      const errData = await res.json();
      alert(`Failed to add expense: ${errData.error || 'Server error'}`);
      return;
    }

    // Clear inputs after success
    document.getElementById('itemName').value = '';
    document.getElementById('itemPrice').value = '';
    document.getElementById('payerSelect').value = '';
    document.querySelectorAll('.participant').forEach((cb) => (cb.checked = false));
    document.getElementById('selectAll').checked = false;

    await displayItems();
    await calculateSplit();
  } catch (err) {
    console.error('Error adding expense:', err);
    alert('Network error while adding expense.');
  }
}

// Function to fetch and display expenses from API
async function displayItems() {
  if (!currentGroup) return;

  const itemsList = document.getElementById('itemsList');
  itemsList.innerHTML = '<li>Loading expenses...</li>';

  try {
    const res = await fetch(`${API_BASE}/${currentGroup._id}/expenses`);
    if (!res.ok) {
      itemsList.innerHTML = '<li>Failed to load expenses.</li>';
      return;
    }

    const expenses = await res.json();
    itemsList.innerHTML = '';

    if (expenses.length === 0) {
      itemsList.innerHTML = '<li>No expenses recorded yet.</li>';
      return;
    }

    expenses.forEach((item) => {
      const priceEuro = (item.amount / 100).toFixed(2);
      itemsList.innerHTML += `
        <li>
          <strong>${item.description}</strong> - €${priceEuro}
          <br />
          <small>Paid by <em>${item.paidBy}</em> | Split between: [${item.splitBetween.join(', ')}]</small>
        </li>
      `;
    });
  } catch (err) {
    console.error('Error loading expenses:', err);
    itemsList.innerHTML = '<li>Error loading expenses.</li>';
  }
}

// Function to calculate balances and suggested debt settlements via API
async function calculateSplit() {
  if (!currentGroup) return;

  const resultList = document.getElementById('resultList');
  const suggestedList = document.getElementById('suggestedSettlementsList');

  resultList.innerHTML = '<li>Loading balances...</li>';
  suggestedList.innerHTML = '<li>Loading suggested settlements...</li>';

  try {
    // 1. Fetch Balances
    const balRes = await fetch(`${API_BASE}/${currentGroup._id}/balances`);
    if (balRes.ok) {
      const { balances } = await balRes.json();
      resultList.innerHTML = '';

      for (const [member, balanceCents] of Object.entries(balances)) {
        const euroAmount = (Math.abs(balanceCents) / 100).toFixed(2);
        let statusText = '';
        if (balanceCents > 0) {
          statusText = `<span style="color: green;">+€${euroAmount} (is owed money)</span>`;
        } else if (balanceCents < 0) {
          statusText = `<span style="color: red;">-€${euroAmount} (owes money)</span>`;
        } else {
          statusText = '<span style="color: gray;">€0.00 (settled)</span>';
        }
        resultList.innerHTML += `<li><strong>${member}</strong>: ${statusText}</li>`;
      }
    }

    // 2. Fetch Suggested Settlements
    const setRes = await fetch(`${API_BASE}/${currentGroup._id}/settlements/suggested`);
    if (setRes.ok) {
      const { settlements } = await setRes.json();
      suggestedList.innerHTML = '';

      if (settlements.length === 0) {
        suggestedList.innerHTML = '<li>All debts are settled! No repayments needed.</li>';
        return;
      }

      settlements.forEach((tx) => {
        const euroAmount = (tx.amount / 100).toFixed(2);
        suggestedList.innerHTML += `
          <li>
            <strong>${tx.from}</strong> pays <strong>${tx.to}</strong> €${euroAmount}
          </li>
        `;
      });
    }
  } catch (err) {
    console.error('Error calculating split:', err);
    resultList.innerHTML = '<li>Error loading balances.</li>';
    suggestedList.innerHTML = '<li>Error loading suggested settlements.</li>';
  }
}

// Function to record a repayment settlement via API
async function recordSettlement() {
  if (!currentGroup) return;

  const from = document.getElementById('settlementFrom').value;
  const to = document.getElementById('settlementTo').value;
  const priceEuro = parseFloat(document.getElementById('settlementAmount').value);

  if (!from || !to || isNaN(priceEuro) || priceEuro <= 0) {
    alert('Please select both payer and recipient, and enter a valid positive amount.');
    return;
  }

  if (from === to) {
    alert("Payer ('from') and recipient ('to') cannot be the same person.");
    return;
  }

  const amountCents = Math.round(priceEuro * 100);

  try {
    const res = await fetch(`${API_BASE}/${currentGroup._id}/settlements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to,
        amount: amountCents,
      }),
    });

    if (!res.ok) {
      const errData = await res.json();
      alert(`Failed to record settlement: ${errData.error || 'Server error'}`);
      return;
    }

    // Clear settlement inputs
    document.getElementById('settlementAmount').value = '';
    document.getElementById('settlementFrom').value = '';
    document.getElementById('settlementTo').value = '';

    await calculateSplit();
  } catch (err) {
    console.error('Error recording settlement:', err);
    alert('Network error while recording settlement.');
  }
}

// Select all participants helper
function selectAllParticipants() {
  const selectAll = document.getElementById('selectAll').checked;
  document.querySelectorAll('.participant').forEach((checkbox) => {
    checkbox.checked = selectAll;
  });
}
