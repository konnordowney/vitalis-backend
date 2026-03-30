const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const Stripe = require('stripe');

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

const SITE_URL = process.env.SITE_URL || 'https://vitalishealth.me';

const PRODUCTS = {
  'starter-kit': {
    name: 'Free Vitalis Detox Starter Kit',
    unit_amount: 0,
    success_path: '/thank-you-detox-starter-kit',
  },
  'supplement-tracker': {
    name: 'Vitalis Supplement Guide + Food Tracker',
    unit_amount: 1700,
    success_path: '/thank-you-supplement-guide-food-tracker',
  },
  'basic-detox': {
    name: 'Vitalis Basic Detox Kit',
    unit_amount: 2700,
    success_path: '/thank-you-basic-detox-kit',
  },
  'essentials-kit': {
    name: 'Vitalis Essentials Detox Kit',
    unit_amount: 3900,
    success_path: '/thank-you-essentials-detox-kit',
  },
};

app.get('/', (req, res) => {
  res.send('Vitalis backend running');
});

app.post('/create-checkout-session', async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided.' });
    }

    const validItems = items
      .map((item) => {
        const product = PRODUCTS[item.id];
        if (!product) return null;

        return {
          id: item.id,
          name: product.name,
          unit_amount: product.unit_amount,
          quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
          success_path: product.success_path,
        };
      })
      .filter(Boolean);

    if (!validItems.length) {
      return res.status(400).json({ error: 'No valid items found.' });
    }

    const line_items = validItems.map((item) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
        },
        unit_amount: item.unit_amount,
      },
      quantity: item.quantity,
    }));

    const highestValueItem = [...validItems].sort(
      (a, b) => b.unit_amount - a.unit_amount
    )[0];

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${SITE_URL}${highestValueItem.success_path}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/`,
      client_reference_id: `vitalis_${Date.now()}`,
      metadata: {
        item_ids: validItems.map((i) => i.id).join(','),
      },
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe session error:', error);
    return res.status(500).json({
      error: error.message || 'Unable to create checkout session.',
    });
  }
});

app.listen(process.env.PORT || 4242, () => {
  console.log(`Vitalis backend listening on port ${process.env.PORT || 4242}`);
});