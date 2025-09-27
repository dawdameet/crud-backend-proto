const express = require('express');
const dangerZoneController = require('../controllers/dangerZoneController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All danger zone routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/danger-zones
 * @desc    Create a new danger zone
 * @access  Private
 * @body    { latitude, longitude, title, description, severity_level? }
 */
router.post('/', dangerZoneController.createDangerZone);

/**
 * @route   GET /api/danger-zones
 * @desc    Get all danger zones with optional filtering
 * @access  Private
 * @query   {
 *            latitude?, longitude?, radius?, 
 *            severity_level?, verified_only?, 
 *            limit?, offset?
 *          }
 */
router.get('/', dangerZoneController.getDangerZones);

/**
 * @route   GET /api/danger-zones/:id
 * @desc    Get a specific danger zone by ID
 * @access  Private
 */
router.get('/:id', dangerZoneController.getDangerZoneById);

/**
 * @route   PUT /api/danger-zones/:id
 * @desc    Update a danger zone (only by creator)
 * @access  Private
 * @body    { title?, description?, severity_level? }
 */
router.put('/:id', dangerZoneController.updateDangerZone);

/**
 * @route   DELETE /api/danger-zones/:id
 * @desc    Delete a danger zone (only by creator)
 * @access  Private
 */
router.delete('/:id', dangerZoneController.deleteDangerZone);

module.exports = router;
