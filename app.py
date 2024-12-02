from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import IntegrityError
from datetime import datetime
import os
import requests  # Required for sending HTTP requests to Power Automate

app = Flask(__name__, static_folder="static", template_folder="templates", instance_relative_config=True)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///orders.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Define Power Automate endpoint (replace with your actual Power Automate URL)
POWER_AUTOMATE_URL = os.getenv("POWER_AUTOMATE_URL", "https://default-url-if-missing.com")

# Define database models
class Customer(db.Model):
    __tablename__ = 'customers'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(255), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    state = db.Column(db.String(50), nullable=True)
    zipstandard = db.Column(db.String(20), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    client = db.Column(db.String(100), nullable=True)
    email = db.Column(db.String(255), nullable=False)
    ordereditems = db.Column(db.String(5000), nullable=False)
    timestamp = db.Column(db.Integer, nullable=False)  # Stores the timestamp

class Order(db.Model):
    __tablename__ = 'orders'
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    ordereditems = db.Column(db.Text, nullable=False)
    email = db.Column(db.String(255), nullable=False)
    client = db.Column(db.String(255), nullable=True)
    address = db.Column(db.String(255), nullable=True)
    timestamp = db.Column(db.Integer, nullable=False)  # Stores the timestamp
    name = db.Column(db.String(255), nullable=True)
    customer = db.relationship('Customer', backref=db.backref('orders', lazy=True))

class Item(db.Model):
    __tablename__ = 'items'
    id = db.Column(db.Integer, primary_key=True)
    title_name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.Text, nullable=True)
    image = db.Column(db.String(255), nullable=True)
    itemstatus = db.Column(db.String(50), nullable=True)
    title = db.Column(db.String(100), nullable=True)
    qty_and_amt = db.Column(db.String(50), nullable=True)
    container_qty = db.Column(db.String(255), nullable=True)

# Initialize the database and create tables if they don't exist
with app.app_context():
    db.create_all()

# Home route to display items in the shop
@app.route('/')
def index():
    items = Item.query.all()  # Fetch all items from the database
    return render_template('index.html', items=items)

# Cart route
@app.route('/cart')
def cart():
    return render_template('cart.html')

# Route to handle order submissions
@app.route('/submit_order', methods=['POST'])
def submit_order():
    order_data = request.get_json()
    customer_info = order_data.get('customer', {})
    ordered_items = order_data.get('items', [])
    order_notes = customer_info.get('orderNotes', '')  # Get order notes
    timestamp = datetime.now().isoformat()  # Use ISO-8601 format for Power Automate

    # Concatenate full address for order logging
    full_address = f"{customer_info.get('address', '')}, {customer_info.get('city', '')}, {customer_info.get('state', '')}, {customer_info.get('zipstandard', '')}"

    # Create and save the customer information
    customer = Customer(
        name=customer_info.get('name', ''),
        address=customer_info.get('address', ''),
        city=customer_info.get('city', ''),
        state=customer_info.get('state', ''),
        zipstandard=customer_info.get('zipstandard', ''),
        phone=customer_info.get('phone', ''),
        client=customer_info.get('client', ''),
        email=customer_info.get('email', ''),
        ordereditems='\n'.join([f"{item.get('title', 'Unknown Item')} (Qty: {item.get('quantity', 1)})" for item in ordered_items]),
        timestamp=int(datetime.now().timestamp())
    )
    db.session.add(customer)
    db.session.commit()

    # Create and save the order entry
    order = Order(
        customer_id=customer.id,
        ordereditems=customer.ordereditems,
        email=customer.email,
        client=customer.client,
        address=full_address,
        name=customer.name,
        timestamp=timestamp
    )
    db.session.add(order)
    db.session.commit()

    # Prepare data for Power Automate integration
    email_data = {
        "customer": {
            "name": customer.name,
            "email": customer.email,
            "address": customer.address,
            "city": customer.city,
            "state": customer.state,
            "zipstandard": customer.zipstandard,
            "phone": customer.phone,
            "client": customer.client,
            "orderNotes": order_notes,  # Include order notes
        },
        "items": [
            {
                "title": item.get("title", "Unknown Item"),
                "quantity": item.get("quantity", 1),
                "containerQty": item.get("containerQty", "")
            }
            for item in ordered_items
        ],
        "orderDate": timestamp  # Use ISO-8601 formatted date-time
    }

    # Send data to Power Automate
    try:
        headers = {
            "Content-Type": "application/json",
            "Accept": "*/*"
        }
        response = requests.post(POWER_AUTOMATE_URL, json=email_data, headers=headers)
        response.raise_for_status()  # Raises error for unsuccessful responses
        print("Order confirmation email sent successfully.")
    except requests.RequestException as e:
        print(f"Failed to send email via Power Automate: {e}")

    return jsonify({"message": "Order submitted and saved successfully!"})

# Additional routes for item management (add, update, delete)...

if __name__ == '__main__':
    app.run(debug=True)
