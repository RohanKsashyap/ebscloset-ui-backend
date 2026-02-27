const { Router } = require('express');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const router = Router();
const { sendOrderConfirmation } = require('../utils/email');
const { decrementStock } = require('../utils/inventory');

// For Stripe integration
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// In the POST /cod route
router.post('/cod', async (req, res) => {
  try {
    const { cart, customer, shippingFee } = req.body;
    const products = cart.map(item => ({
      productId: item.productId, // Expect actual Mongo _id here
      title: item.title,
      price: item.unitPrice / 100, // Convert cents to dollars
      quantity: item.quantity,
      variantName: item.variantName || ''
    }));
    
    const subtotal = products.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = (shippingFee || 0) / 100;
    const totalAmount = subtotal + shipping;

    // Validate stock for each item before creating the order
    for (const item of products) {
      // Find product by ID; fallback by name
      let productDoc = null;
      try {
        productDoc = await Product.findById(item.productId);
      } catch (_) {}
      if (!productDoc) {
        productDoc = await Product.findOne({ name: item.title });
      }
      if (!productDoc) {
        return res.status(400).json({ message: `Product not found: ${item.title}` });
      }
      const qty = Number(item.quantity) || 0;
      // Attach image (prefer original image) for email/order display; only keep absolute URLs and strip IK transforms
      {
        let url = productDoc.image || productDoc.thumbnailUrl || '';
        if (/^https?:\/\//i.test(url)) {
          // Remove ImageKit transform segment if present to avoid signed/blocked transforms in email clients
          url = url.replace(/\/tr:[^/]+/, '');
          item.image = url;
        } else {
          item.image = '';
        }
      }
      if (item.variantName) {
        const variant = (productDoc.variants || []).find(v => v.name === item.variantName);
        if (!variant) {
          return res.status(400).json({ message: `Variant not found for ${productDoc.name}: ${item.variantName}` });
        }
        if ((variant.inStock ?? 0) < qty) {
          return res.status(400).json({ message: `${productDoc.name} (${variant.name}) is out of stock or insufficient quantity` });
        }
      } else {
        if ((productDoc.inStock ?? 0) < qty) {
          return res.status(400).json({ message: `${productDoc.name} is out of stock or insufficient quantity` });
        }
      }
    }
    
    // Create the order
    const order = new Order({
      products,
      customer,
      subtotal,
      shippingFee: shipping,
      totalAmount,
      paymentMethod: 'COD',
      status: 'pending'
    });

    // Generate readable orderId from _id
    order.orderId = `AC-${order._id.toString().toUpperCase()}`;
    await order.save();

    // Fire-and-forget order confirmation email (SendGrid/Twilio)
    try { await sendOrderConfirmation(order); } catch (_) {}

    // Decrement stock for COD order
    try { await decrementStock(products, order._id); } catch (err) {
      console.error('Inventory decrement failed for COD:', err);
    }

    // Store or update user information
    if (customer.email) {
      // Check if user exists
      let user = await User.findOne({ email: customer.email });
      
      if (user) {
        // Update existing user with latest information if not an admin
        if (user.role !== 'admin') {
          user.fullName = customer.fullName;
          user.phone = customer.phone;
          user.address = customer.address;
          user.city = customer.city;
          user.postalCode = customer.postalCode;
          user.country = customer.country;
        }
        user.orders.push(order._id);
        await user.save();
      } else {
        // Create new user
        user = new User({
          email: customer.email,
          fullName: customer.fullName,
          phone: customer.phone,
          address: customer.address,
          city: customer.city,
          postalCode: customer.postalCode,
          country: customer.country,
          role: 'user',
          orders: [order._id]
        });
        await user.save();
      }
    }
    
    res.status(201).json({ orderId: order._id });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ message: 'Error creating order' });
  }
});

router.get('/order/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ message: 'Error fetching order' });
  }
});

router.get('/orders', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('orders');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Return orders sorted by createdAt descending
    const orders = user.orders.sort((a, b) => b.createdAt - a.createdAt);
    res.json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ message: 'Error fetching orders' });
  }
});

router.post('/stripe-session', async (req, res) => {
  try {
    const { cart, customer, successUrl, cancelUrl } = req.body;
    
    // Create line items for Stripe
    const lineItems = cart.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.title,
        },
        unit_amount: item.unitPrice, // Already in cents
      },
      quantity: item.quantity,
    }));
    
    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customer.email,
      metadata: {
        customerData: JSON.stringify(customer),
        cartData: JSON.stringify(cart.map(item => ({
          productId: item.productId,
          variantName: item.variantName || '',
          quantity: item.quantity,
          title: item.title,
          price: item.unitPrice / 100
        })))
      }
    });
    
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe session error:', err);
    res.status(500).json({ message: 'Error creating Stripe session' });
  }
});

// Stripe webhook to handle successful payments
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    try {
      // Extract customer data and cart data from metadata
      const customer = JSON.parse(session.metadata.customerData);
      const cartItems = JSON.parse(session.metadata.cartData || '[]');
      
      // Enrich products array with images from Product model
      const products = await Promise.all(cartItems.map(async (item) => {
        let image = '';
        try {
          const productDoc = await Product.findById(item.productId) || await Product.findOne({ name: item.title });
          if (productDoc) {
            let url = productDoc.image || productDoc.thumbnailUrl || '';
            if (/^https?:\/\//i.test(url)) {
              url = url.replace(/\/tr:[^/]+/, '');
              image = url;
            }
          }
        } catch (_) {}
        
        return {
          productId: item.productId,
          title: item.title,
          image: image,
          price: item.price,
          quantity: item.quantity,
          variantName: item.variantName || ''
        };
      }));
      
      // Create order in database
      const order = new Order({
        products,
        customer,
        totalAmount: session.amount_total / 100, // Convert cents to dollars
        paymentMethod: 'Stripe',
        status: 'processing'
      });

      // Generate readable orderId from _id
      order.orderId = `AC-${order._id.toString().toUpperCase()}`;
      await order.save();

      // Decrement stock for Stripe order
      try { await decrementStock(products, order._id); } catch (err) {
        console.error('Inventory decrement failed for Stripe:', err);
      }

      // Fire-and-forget order confirmation email (SendGrid/Twilio)
      try { await sendOrderConfirmation(order); } catch (_) {}

      // Store or update user information
      if (customer.email) {
        // Check if user exists
        let user = await User.findOne({ email: customer.email });
        
        if (user) {
          // Update existing user with latest information if not an admin
          if (user.role !== 'admin') {
            user.fullName = customer.fullName;
            user.phone = customer.phone;
            user.address = customer.address;
            user.city = customer.city;
            user.postalCode = customer.postalCode;
            user.country = customer.country;
          }
          user.orders.push(order._id);
          await user.save();
        } else {
          // Create new user
          user = new User({
            email: customer.email,
            fullName: customer.fullName,
            phone: customer.phone,
            address: customer.address,
            city: customer.city,
            postalCode: customer.postalCode,
            country: customer.country,
            role: 'user',
            orders: [order._id]
          });
          await user.save();
        }
      }
    } catch (err) {
      console.error('Error processing Stripe webhook:', err);
    }
  }

  res.json({ received: true });
});

module.exports = router;
