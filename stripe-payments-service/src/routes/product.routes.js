import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { listProducts } from '../services/product.service.js';

const router = Router();

// GET /v1/products
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const products = await listProducts({ limit: Number(req.query.limit) || 100 });
    res.json({ data: products });
  }),
);

export default router;
