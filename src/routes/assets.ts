import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { getAssetsByParentId, createAsset } from '../db';
import { Role } from '../../types';

const router = express.Router();

// GET /api/assets?parent_id=...
router.get('/', authenticateToken, async (req, res) => {
  try {
    const parentId = req.query.parent_id as string;
    if (!parentId) return res.status(400).json({ error: 'parent_id is required' });
    const assets = await getAssetsByParentId(parentId);
    res.json(assets);
  } catch (err) {
    console.error('Get assets error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/assets
router.post('/', authenticateToken, requireRole(Role.EDITOR), async (req, res) => {
  try {
    const { parent_id, language, variant, asset_type, url } = req.body;
    
    console.log('[Assets API] Received request:', { parent_id, language, variant, asset_type, url });
    
    const missing = [];
    if (!parent_id) missing.push('parent_id');
    if (!language) missing.push('language');
    if (!variant) missing.push('variant');
    if (!asset_type) missing.push('asset_type');
    if (!url) missing.push('url');
    
    if (missing.length > 0) {
      console.error('[Assets API] Missing fields:', missing);
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }

    const asset = await createAsset({ parent_id, language, variant, asset_type, url });
    res.status(201).json(asset);
  } catch (err) {
    console.error('Create asset error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
