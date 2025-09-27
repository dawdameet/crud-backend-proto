const { supabaseAdmin } = require('../config/database');
const logger = require('../config/logger');

class DangerZoneController {
  /**
   * Create a new danger zone
   */
  async createDangerZone(req, res) {
    try {
      const { latitude, longitude, title, description, severity_level } = req.body;
      const userId = req.user.id;

      // Validate required fields
      if (!latitude || !longitude || !title || !description) {
        return res.status(400).json({
          success: false,
          message: 'Latitude, longitude, title, and description are required'
        });
      }

      // Validate severity level
      const validSeverityLevels = ['low', 'medium', 'high', 'critical'];
      if (severity_level && !validSeverityLevels.includes(severity_level)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid severity level. Must be one of: low, medium, high, critical'
        });
      }

      // Create danger zone
      const { data: newDangerZone, error } = await supabaseAdmin
        .from('danger_zones')
        .insert({
          user_id: userId,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          title: title.trim(),
          description: description.trim(),
          severity_level: severity_level || 'medium'
        })
        .select(`
          id,
          latitude,
          longitude,
          title,
          description,
          severity_level,
          is_verified,
          verification_count,
          created_at,
          users!inner(id, username, first_name, last_name)
        `)
        .single();

      if (error) {
        throw new Error(`Failed to create danger zone: ${error.message}`);
      }

      logger.info('Danger zone created successfully', {
        dangerZoneId: newDangerZone.id,
        userId,
        title: newDangerZone.title,
        severity: newDangerZone.severity_level
      });

      res.status(201).json({
        success: true,
        message: 'Danger zone created successfully',
        data: {
          dangerZone: {
            id: newDangerZone.id,
            latitude: newDangerZone.latitude,
            longitude: newDangerZone.longitude,
            title: newDangerZone.title,
            description: newDangerZone.description,
            severity_level: newDangerZone.severity_level,
            is_verified: newDangerZone.is_verified,
            verification_count: newDangerZone.verification_count,
            created_at: newDangerZone.created_at,
            reporter: {
              id: newDangerZone.users.id,
              username: newDangerZone.users.username,
              name: `${newDangerZone.users.first_name || ''} ${newDangerZone.users.last_name || ''}`.trim()
            }
          }
        }
      });
    } catch (error) {
      logger.error('Create danger zone controller error', {
        error: error.message,
        body: req.body,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create danger zone'
      });
    }
  }

  /**
   * Get all danger zones (with optional location filtering)
   */
  async getDangerZones(req, res) {
    try {
      const { 
        latitude, 
        longitude, 
        radius = 10, // Default 10km radius
        severity_level,
        verified_only = false,
        limit = 100,
        offset = 0
      } = req.query;

      let query = supabaseAdmin
        .from('danger_zones')
        .select(`
          id,
          latitude,
          longitude,
          title,
          description,
          severity_level,
          is_verified,
          verification_count,
          created_at,
          users!inner(id, username, first_name, last_name)
        `);

      // Filter by severity level if provided
      if (severity_level) {
        query = query.eq('severity_level', severity_level);
      }

      // Filter by verified status if requested
      if (verified_only === 'true') {
        query = query.eq('is_verified', true);
      }

      // Apply pagination
      query = query
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)
        .order('created_at', { ascending: false });

      const { data: dangerZones, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch danger zones: ${error.message}`);
      }

      // Filter by location if coordinates provided
      let filteredZones = dangerZones;
      if (latitude && longitude) {
        const userLat = parseFloat(latitude);
        const userLng = parseFloat(longitude);
        const radiusKm = parseFloat(radius);

        filteredZones = dangerZones.filter(zone => {
          const distance = calculateDistance(
            userLat, userLng,
            zone.latitude, zone.longitude
          );
          return distance <= radiusKm;
        });
      }

      // Format response
      const formattedZones = filteredZones.map(zone => ({
        id: zone.id,
        latitude: zone.latitude,
        longitude: zone.longitude,
        title: zone.title,
        description: zone.description,
        severity_level: zone.severity_level,
        is_verified: zone.is_verified,
        verification_count: zone.verification_count,
        created_at: zone.created_at,
        reporter: {
          id: zone.users.id,
          username: zone.users.username,
          name: `${zone.users.first_name || ''} ${zone.users.last_name || ''}`.trim()
        }
      }));

      res.json({
        success: true,
        message: 'Danger zones retrieved successfully',
        data: {
          dangerZones: formattedZones,
          total: formattedZones.length,
          filters: {
            latitude: latitude || null,
            longitude: longitude || null,
            radius: latitude && longitude ? radiusKm : null,
            severity_level: severity_level || null,
            verified_only: verified_only === 'true'
          }
        }
      });
    } catch (error) {
      logger.error('Get danger zones controller error', {
        error: error.message,
        query: req.query
      });

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve danger zones'
      });
    }
  }

  /**
   * Get a specific danger zone by ID
   */
  async getDangerZoneById(req, res) {
    try {
      const { id } = req.params;

      const { data: dangerZone, error } = await supabaseAdmin
        .from('danger_zones')
        .select(`
          id,
          latitude,
          longitude,
          title,
          description,
          severity_level,
          is_verified,
          verification_count,
          created_at,
          updated_at,
          users!inner(id, username, first_name, last_name)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            message: 'Danger zone not found'
          });
        }
        throw new Error(`Failed to fetch danger zone: ${error.message}`);
      }

      res.json({
        success: true,
        message: 'Danger zone retrieved successfully',
        data: {
          dangerZone: {
            id: dangerZone.id,
            latitude: dangerZone.latitude,
            longitude: dangerZone.longitude,
            title: dangerZone.title,
            description: dangerZone.description,
            severity_level: dangerZone.severity_level,
            is_verified: dangerZone.is_verified,
            verification_count: dangerZone.verification_count,
            created_at: dangerZone.created_at,
            updated_at: dangerZone.updated_at,
            reporter: {
              id: dangerZone.users.id,
              username: dangerZone.users.username,
              name: `${dangerZone.users.first_name || ''} ${dangerZone.users.last_name || ''}`.trim()
            }
          }
        }
      });
    } catch (error) {
      logger.error('Get danger zone by ID controller error', {
        error: error.message,
        dangerZoneId: req.params.id
      });

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve danger zone'
      });
    }
  }

  /**
   * Update a danger zone (only by the creator)
   */
  async updateDangerZone(req, res) {
    try {
      const { id } = req.params;
      const { title, description, severity_level } = req.body;
      const userId = req.user.id;

      // Check if danger zone exists and user is the creator
      const { data: existingZone, error: fetchError } = await supabaseAdmin
        .from('danger_zones')
        .select('id, user_id')
        .eq('id', id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            message: 'Danger zone not found'
          });
        }
        throw new Error(`Failed to fetch danger zone: ${fetchError.message}`);
      }

      if (existingZone.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own danger zones'
        });
      }

      // Prepare update data
      const updateData = {};
      if (title) updateData.title = title.trim();
      if (description) updateData.description = description.trim();
      if (severity_level) {
        const validSeverityLevels = ['low', 'medium', 'high', 'critical'];
        if (!validSeverityLevels.includes(severity_level)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid severity level. Must be one of: low, medium, high, critical'
          });
        }
        updateData.severity_level = severity_level;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields provided for update'
        });
      }

      // Update the danger zone
      const { data: updatedZone, error: updateError } = await supabaseAdmin
        .from('danger_zones')
        .update(updateData)
        .eq('id', id)
        .select(`
          id,
          latitude,
          longitude,
          title,
          description,
          severity_level,
          is_verified,
          verification_count,
          created_at,
          updated_at,
          users!inner(id, username, first_name, last_name)
        `)
        .single();

      if (updateError) {
        throw new Error(`Failed to update danger zone: ${updateError.message}`);
      }

      logger.info('Danger zone updated successfully', {
        dangerZoneId: id,
        userId,
        updatedFields: Object.keys(updateData)
      });

      res.json({
        success: true,
        message: 'Danger zone updated successfully',
        data: {
          dangerZone: {
            id: updatedZone.id,
            latitude: updatedZone.latitude,
            longitude: updatedZone.longitude,
            title: updatedZone.title,
            description: updatedZone.description,
            severity_level: updatedZone.severity_level,
            is_verified: updatedZone.is_verified,
            verification_count: updatedZone.verification_count,
            created_at: updatedZone.created_at,
            updated_at: updatedZone.updated_at,
            reporter: {
              id: updatedZone.users.id,
              username: updatedZone.users.username,
              name: `${updatedZone.users.first_name || ''} ${updatedZone.users.last_name || ''}`.trim()
            }
          }
        }
      });
    } catch (error) {
      logger.error('Update danger zone controller error', {
        error: error.message,
        dangerZoneId: req.params.id,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update danger zone'
      });
    }
  }

  /**
   * Delete a danger zone (only by the creator)
   */
  async deleteDangerZone(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check if danger zone exists and user is the creator
      const { data: existingZone, error: fetchError } = await supabaseAdmin
        .from('danger_zones')
        .select('id, user_id, title')
        .eq('id', id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            message: 'Danger zone not found'
          });
        }
        throw new Error(`Failed to fetch danger zone: ${fetchError.message}`);
      }

      if (existingZone.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own danger zones'
        });
      }

      // Delete the danger zone
      const { error: deleteError } = await supabaseAdmin
        .from('danger_zones')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw new Error(`Failed to delete danger zone: ${deleteError.message}`);
      }

      logger.info('Danger zone deleted successfully', {
        dangerZoneId: id,
        userId,
        title: existingZone.title
      });

      res.json({
        success: true,
        message: 'Danger zone deleted successfully'
      });
    } catch (error) {
      logger.error('Delete danger zone controller error', {
        error: error.message,
        dangerZoneId: req.params.id,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete danger zone'
      });
    }
  }
}

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in kilometers
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

module.exports = new DangerZoneController();
