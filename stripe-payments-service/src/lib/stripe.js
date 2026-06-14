import Stripe from 'stripe';
import { config } from '../config/env.js';

const options = { appInfo: { name: 'stripe-payments-service', version: '1.0.0' } };
if (config.stripe.apiVersion) options.apiVersion = config.stripe.apiVersion;

export const stripe = new Stripe(config.stripe.secretKey, options);
