// Initialize an empty cart or load from localStorage
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// Function to update the cart counter and control "Go to Cart" and "Checkout" button states
function updateCartCounter() {
  console.log("updateCartCounter triggered");
  const cartCounter = document.getElementById("cart-counter");
  const goToCartButton = document.getElementById("go-to-cart-button");

  // Calculate the total items in the cart
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCounter.textContent = totalItems;

  // Enable or disable the "Go to Cart" button based on cart contents
  if (goToCartButton) {
    goToCartButton.disabled = totalItems === 0;
  }

  // Validate checkout button whenever cart changes
  validateCheckoutButton();
}

// Function to disable Add to Cart buttons for out-of-stock items and add event listeners
function initializeAddToCartButtons() {
  console.log("initializeAddToCartButtons triggered");
  const addToCartButtons = document.querySelectorAll(".add-to-cart");

  addToCartButtons.forEach((button) => {
    const itemStatus = button.getAttribute("data-itemstatus");
    const itemId = parseInt(button.getAttribute("data-itemid"));
    const itemTitle = button.getAttribute("data-title");

    // Define a single reference for the add to cart handler
    function handleAddToCart() {
      addToCart(itemId, itemTitle, itemStatus);
    }

    // Remove any existing event listener and then add it to prevent duplicates
    button.removeEventListener("click", handleAddToCart);

    if (itemStatus === "Out of Stock") {
      button.disabled = true;
      button.classList.add("disabled-button");
    }
  });
}

// Function to validate the checkout button based on cart items and form inputs
function validateCheckoutButton() {
  console.log("validateCheckoutButton triggered");
  const checkoutButton = document.getElementById("checkout-btn");
  const formInputs = document.querySelectorAll(
    "#checkout-form input[required]"
  );

  // Check that all required inputs are filled
  const isFormFilled = Array.from(formInputs).every(
    (input) => input.value.trim() !== ""
  );
  console.log("isFormFilled:", isFormFilled);

  // Calculate total items in the cart
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Enable or disable the checkout button based on conditions
  if (checkoutButton) {
    checkoutButton.disabled = !(totalItems !== 0);
  }
  console.log("Checkout button enabled:", !checkoutButton.disabled);
}

// Attach validation to form inputs for real-time feedback
function attachFormValidation() {
  console.log("attachFormValidation triggered");
  const formInputs = document.querySelectorAll(
    "#checkout-form input[required]"
  );
  formInputs.forEach((input) => {
    input.addEventListener("input", validateCheckoutButton);
  });
}

// Function to add item to the cart
function addToCart(itemId, itemTitle, itemStatus) {
  console.log("addToCart triggered");
  if (itemStatus === "Out of Stock") return;

  const containerQtyElement = document.getElementById(`containerQty-${itemId}`);
  const orderAmountElement = document.getElementById(`orderAmount-${itemId}`);

  const selectedContainerQty = containerQtyElement
    ? containerQtyElement.value
    : "Default";
  const selectedOrderAmount = orderAmountElement
    ? parseInt(orderAmountElement.value)
    : 1;

  // Check if the item with the same container quantity already exists in the cart
  const existingItem = cart.find(
    (item) => item.id === itemId && item.containerQty === selectedContainerQty
  );

  if (existingItem) {
    existingItem.quantity += selectedOrderAmount;
  } else {
    cart.push({
      id: itemId,
      title: itemTitle,
      containerQty: selectedContainerQty,
      quantity: selectedOrderAmount,
    });
  }

  localStorage.setItem("cart", JSON.stringify(cart)); // Save cart to localStorage
  alert("Item added to cart!");
  updateCartCounter(); // Update the counter after adding an item
}

// Function to load and display cart items in cart.html
function displayCartItems() {
  console.log("displayCartItems triggered");
  const cartItemsDiv = document.getElementById("cart-items");
  if (!cartItemsDiv) return; // Exit if not on cart page

  cartItemsDiv.innerHTML = ""; // Clear previous items

  if (cart.length === 0) {
    cartItemsDiv.innerHTML = "<p>Cart is Empty</p>";
  } else {
    cart.forEach((item) => {
      const itemDiv = document.createElement("div");
      itemDiv.classList.add("cart-item");
      itemDiv.innerHTML = `
        <p>Title: ${item.title}</p>
        <p>Container Qty: ${item.containerQty}</p>
        <p>Order Amount: ${item.quantity}</p>
      `;
      cartItemsDiv.appendChild(itemDiv);
    });
  }
  validateCheckoutButton(); // Validate checkout button status
}

// Function to handle checkout form submission
function checkout(event) {
  console.log("checkout triggered");
  event.preventDefault(); // Prevent default form submission

  const checkoutButton = document.getElementById("checkout-btn");

  // Disable checkout button to prevent double submission
  if (checkoutButton.disabled) return; // Prevent further action if already disabled
  checkoutButton.disabled = true;

  // Collect data from form inputs
  const orderNotes = document.getElementById("orderNotes").value; // Capture the notes field

  const orderData = {
    customer: {
      name: document.getElementById("customerName").value,
      email: document.getElementById("customerEmail").value,
      address: document.getElementById("customerAddress").value,
      city: document.getElementById("customerCity").value,
      state: document.getElementById("customerState").value,
      zipstandard: document.getElementById("customerZip").value,
      phone: document.getElementById("customerPhone").value,
      client: document.getElementById("customerClient").value,
      orderNotes: orderNotes, // Include order notes
    },
    items: cart.map((item) => ({
      title: item.title,
      quantity: item.quantity,
      containerQty: item.containerQty,
    })),
    orderDate: new Date().toISOString(),
  };

  fetch("/submit_order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderData),
  })
    .then((response) => {
      if (!response.ok) throw new Error("Failed to save order to the database");
      return response.json();
    })
    .then(() => {
      // Show success message
      alert("Order successfully sent and processed!");

      // Clear the cart and update local storage and display
      clearCart();

      // Redirect to the index page after 3 seconds
      setTimeout(() => {
        window.location.href = "http://127.0.0.1:5000/";
      }, 2000); // 3000 milliseconds = 3 seconds
    })
    .catch((error) => {
      console.error("Error during checkout process:", error);
      //alert("Failed to complete the order process. Please try again.");
    });
}

// Function to clear the cart
function clearCart() {
  console.log("clearCart triggered");
  cart = []; // Empty the cart array
  localStorage.setItem("cart", JSON.stringify(cart)); // Update localStorage
  displayCartItems(); // Update cart display on the page
  updateCartCounter(); // Update cart counter if needed
}

// Function to go back to the shop page
function goBack() {
  console.log("goBack triggered");
  window.location.href = "/";
}

// Load cart items if on the cart page, update cart counter, initialize Add to Cart buttons, and run initial validation
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded event triggered");
  displayCartItems();
  updateCartCounter();
  initializeAddToCartButtons();
  attachFormValidation(); // Attach real-time validation to form inputs

  // Initial validation to set the correct state of the checkout button on load
  validateCheckoutButton();

  // Attach checkout function to form submission only once
  const checkoutForm = document.getElementById("checkout-form");
  if (checkoutForm && !checkoutForm.hasAttribute("data-listener-added")) {
    checkoutForm.addEventListener("submit", checkout);
    checkoutForm.setAttribute("data-listener-added", "true"); // Mark listener as added
    console.log("Checkout event listener added");
  } else {
    console.log("Checkout event listener already added");
  }
});
