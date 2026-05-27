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
    console.log('COD Request Body:', JSON.stringify(req.body, null, 2));

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ message: 'Cart is empty or invalid' });
    }

    const products = cart.map(item => ({
      productId: item.productId, // Expect actual Mongo _id here
      title: item.title,
      price: item.unitPrice / 100, // Convert cents to dollars
      quantity: item.quantity,
      variantName: item.variantName || '',
      sku: item.sku,
      color: item.color,
      variantId: item.variantId
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

      // Stock validation logic
      let availableStock = 0;
      let selectedVariant = null;

      if (productDoc.variants && productDoc.variants.length > 0) {
        // 1. Try matching by variantId (most reliable if present)
        if (item.variantId) {
          selectedVariant = productDoc.variants.id(item.variantId);
        }

        // 2. Try matching by SKU
        if (!selectedVariant && item.sku) {
          selectedVariant = productDoc.variants.find(v => v.sku === item.sku);
        }

        // 3. Try matching by color AND size
        if (!selectedVariant && item.color && item.variantName) {
          selectedVariant = productDoc.variants.find(v => {
            const vColor = (v.attributes?.color || v.color || '').toLowerCase();
            const vSize = (v.attributes?.size || v.size || '').toLowerCase();
            return vColor === item.color.toLowerCase() && vSize === item.variantName.toLowerCase();
          });
        }

        // 4. Try matching by name/size fallback (current logic)
        if (!selectedVariant && item.variantName) {
          const lowerVariantName = item.variantName.toLowerCase();
          selectedVariant = productDoc.variants.find(v => {
            const vName = (v.name || '').toLowerCase();
            const vSize = (v.size || v.attributes?.size || '').toLowerCase();
            return vName === lowerVariantName || vSize === lowerVariantName;
          });
        }

        if (selectedVariant) {
          availableStock = Number(selectedVariant.stock?.quantity ?? selectedVariant.inStock ?? 0);
        }
      }

      // Fallback: Check the legacy 'stock' object
      if (!selectedVariant && productDoc.stock && item.variantName && productDoc.stock[item.variantName] !== undefined) {
        availableStock = Number(productDoc.stock[item.variantName]) || 0;
      } 
      // Fallback: Use top-level inStock if no variants or no match
      else if (!selectedVariant) {
        availableStock = Number(productDoc.inStock) || 0;
      }

      if (availableStock < qty) {
        const variantLabel = selectedVariant 
          ? (selectedVariant.name || selectedVariant.size || item.variantName)
          : item.variantName;
        return res.status(400).json({ message: `${productDoc.name} ${variantLabel ? `(${variantLabel})` : ''} is out of stock or insufficient quantity` });
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

    // Note: Stock decrement is now handled by admin on order approval
    /*
    try { await decrementStock(products, order._id); } catch (err) {
      console.error('Inventory decrement failed for COD:', err);
    }
    */

    // Store or update user information
    if (customer.email) {
      // Check if user exists
      let user = await User.findOne({ email: customer.email });
      
      const addressData = {
        fullName: customer.fullName,
        phone: customer.phone,
        address: customer.address,
        suburb: customer.suburb,
        state: customer.state,
        city: customer.city,
        postalCode: customer.postalCode,
        country: customer.country,
        isPrimary: true
      };

      if (user) {
        // Update existing user with latest information if not an admin
        if (user.role !== 'admin') {
          user.fullName = customer.fullName;
          user.phone = customer.phone;
          user.address = customer.address;
          user.suburb = customer.suburb;
          user.state = customer.state;
          user.city = customer.city;
          user.postalCode = customer.postalCode;
          user.country = customer.country;
          
          // Add address to addresses array if not already present
          const addressExists = user.addresses.some(a => a.address === customer.address && a.city === customer.city);
          if (!addressExists) {
            user.addresses.push(addressData);
          }
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
          suburb: customer.suburb,
          state: customer.state,
          city: customer.city,
          postalCode: customer.postalCode,
          country: customer.country,
          role: 'user',
          orders: [order._id],
          addresses: [addressData],
          password: Math.random().toString(36).slice(-8) // Random password for guest
        });
        await user.save();
      }
    }
    
    res.status(201).json({ orderId: order._id });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ message: 'Error creating order', error: err.message });
  }
});

// Route to create a Stripe payment session for an existing order (e.g., COD to Prepaid)
router.post('/create-payment-session/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Create line items for Stripe
    const lineItems = order.products.map(item => ({
      price_data: {
        currency: 'aud',
        product_data: {
          name: item.title,
          description: item.variantName ? `Variant: ${item.variantName}` : undefined,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    if (order.shippingFee > 0) {
      lineItems.push({
        price_data: {
          currency: 'aud',
          product_data: { name: 'Shipping Fee' },
          unit_amount: Math.round(order.shippingFee * 100),
        },
        quantity: 1,
      });
    }

    if (order.tax > 0) {
      lineItems.push({
        price_data: {
          currency: 'aud',
          product_data: { name: 'Tax (GST)' },
          unit_amount: Math.round(order.tax * 100),
        },
        quantity: 1,
      });
    }

    const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${frontendOrigin}/order-success?id=${order._id}&payment=success`,
      cancel_url: `${frontendOrigin}/order-success?id=${order._id}&payment=cancel`,
      customer_email: order.customer.email,
      metadata: {
        existingOrderId: order._id.toString()
      }
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Error creating payment session:', err);
    res.status(500).json({ message: 'Error creating payment session' });
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
    const { cart, customer, successUrl, cancelUrl, shippingFee, tax } = req.body;
    
    // Validate stock before creating Stripe session
    for (const item of cart) {
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

      const qty = Number(item.quantity) || 1;
      let availableStock = 0;
      let selectedVariant = null;

      if (productDoc.variants && productDoc.variants.length > 0) {
        if (item.variantId) {
          selectedVariant = productDoc.variants.id(item.variantId);
        }
        if (!selectedVariant && item.sku) {
          selectedVariant = productDoc.variants.find(v => v.sku === item.sku);
        }
        if (!selectedVariant && item.color && item.variantName) {
          selectedVariant = productDoc.variants.find(v => {
            const vColor = (v.attributes?.color || v.color || '').toLowerCase();
            const vSize = (v.attributes?.size || v.size || '').toLowerCase();
            return vColor === item.color.toLowerCase() && vSize === item.variantName.toLowerCase();
          });
        }
        if (!selectedVariant && item.variantName) {
          const lowerVariantName = item.variantName.toLowerCase();
          selectedVariant = productDoc.variants.find(v => {
            const vName = (v.name || '').toLowerCase();
            const vSize = (v.size || v.attributes?.size || '').toLowerCase();
            return vName === lowerVariantName || vSize === lowerVariantName;
          });
        }

        if (selectedVariant) {
          availableStock = Number(selectedVariant.stock?.quantity ?? selectedVariant.inStock ?? 0);
        }
      }

      if (!selectedVariant && productDoc.stock && item.variantName && productDoc.stock[item.variantName] !== undefined) {
        availableStock = Number(productDoc.stock[item.variantName]) || 0;
      } else if (!selectedVariant) {
        availableStock = Number(productDoc.inStock) || 0;
      }

      if (availableStock < qty) {
        const variantLabel = selectedVariant 
          ? (selectedVariant.name || selectedVariant.size || item.variantName)
          : item.variantName;
        return res.status(400).json({ message: `${productDoc.name} ${variantLabel ? `(${variantLabel})` : ''} is out of stock or insufficient quantity` });
      }
    }

    // Create line items for Stripe
    const lineItems = cart.map(item => ({
      price_data: {
        currency: 'aud',
        product_data: {
          name: item.title,
          description: item.variantName ? `Size: ${item.variantName}` : undefined,
        },
        unit_amount: Math.round(item.unitPrice), // Already in cents
      },
      quantity: item.quantity,
    }));

    // Add shipping fee if present
    if (shippingFee > 0) {
      lineItems.push({
        price_data: {
          currency: 'aud',
          product_data: {
            name: 'Shipping Fee',
          },
          unit_amount: Math.round(shippingFee),
        },
        quantity: 1,
      });
    }

    // Add tax if present
    if (tax > 0) {
      lineItems.push({
        price_data: {
          currency: 'aud',
          product_data: {
            name: 'Tax (GST)',
          },
          unit_amount: Math.round(tax),
        },
        quantity: 1,
      });
    }
    
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
          price: item.unitPrice / 100,
          sku: item.sku,
          color: item.color,
          variantId: item.variantId
        }))),
        tax: tax ? String(tax) : '0',
        shippingFee: shippingFee ? String(shippingFee) : '0'
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
      // Check if this was a payment for an existing order
      if (session.metadata && session.metadata.existingOrderId) {
        const order = await Order.findById(session.metadata.existingOrderId);
        if (order) {
          order.paymentMethod = 'Stripe';
          order.status = 'processing';
          
          if (!order.stockDecremented) {
            try {
              await decrementStock(order.products, order._id);
              order.stockDecremented = true;
            } catch (err) {
              console.error('Inventory decrement failed for existing order upgrade:', err);
            }
          }
          
          await order.save();
          
          // Send payment confirmation email
          try { await sendOrderConfirmation(order); } catch (_) {}
          
          return res.json({ received: true });
        }
      }

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
          variantName: item.variantName || '',
          sku: item.sku,
          color: item.color,
          variantId: item.variantId
        };
      }));
      
      // Create order in database
      const subtotal = products.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const totalAmount = session.amount_total / 100;
      const tax = Number(session.metadata.tax || 0) / 100;
      const shippingFee = Number(session.metadata.shippingFee || 0) / 100;

      const order = new Order({
        products,
        customer,
        subtotal,
        shippingFee,
        tax,
        totalAmount,
        paymentMethod: 'Stripe',
        status: 'processing'
      });

      // Generate readable orderId from _id
      order.orderId = `AC-${order._id.toString().toUpperCase()}`;
      
      // Handle stock decrement for paid orders immediately
      try { 
        await decrementStock(products, order._id);
        order.stockDecremented = true;
      } catch (err) {
        console.error('Inventory decrement failed for Stripe:', err);
      }
      
      await order.save();

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
