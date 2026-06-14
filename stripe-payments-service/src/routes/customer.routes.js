import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { findOrCreateCustomer, getCustomer, listCustomerSubscriptions } from '../services/customer.service.js';

const router = Router();

// POST /v1/customers  -> find-or-create
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { email, name, phone, externalId, metadata } = req.body;
    const customer = await findOrCreateCustomer({ app: req.app_name, email, name, phone, externalId, metadata });
    res.status(201).json({ id: customer.id, email: customer.email, name: customer.name });
  }),
);

// GET /v1/customers/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const customer = await getCustomer(req.params.id);
    res.json(customer);
  }),
);

// GET /v1/customers/:id/subscriptions
router.get(
  '/:id/subscriptions',
  asyncHandler(async (req, res) => {
    const subs = await listCustomerSubscriptions(req.params.id);
    res.json({ data: subs });
  }),
);

export default router;
