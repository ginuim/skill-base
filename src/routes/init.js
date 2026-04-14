const bcrypt = require('bcryptjs');
const db = require('../database');

/**
 * System initialization routes
 * @param {import('fastify').FastifyInstance} fastify
 */
async function initRoutes(fastify) {
    /**
     * GET /api/v1/init/status
     * Check if system needs initialization (whether admin user exists)
     */
    fastify.get('/status', async (request, reply) => {
        const adminCount = db.prepare(
            "SELECT COUNT(*) as count FROM users WHERE role = 'admin'"
        ).get();
        
        return {
            initialized: adminCount.count > 0
        };
    });

    /**
     * POST /api/v1/init/setup
     * Initialize system admin account
     * Body: { username, password }
     */
    fastify.post('/setup', async (request, reply) => {
        // Check if already initialized
        const adminCount = db.prepare(
            "SELECT COUNT(*) as count FROM users WHERE role = 'admin'"
        ).get();
        
        if (adminCount.count > 0) {
            return reply.code(400).send({ 
                error: 'System already initialized' 
            });
        }
        
        const { username, password } = request.body || {};
        
        // Validate input
        if (!username || !password) {
            return reply.code(400).send({ 
                error: 'Username and password are required' 
            });
        }
        
        if (username.length < 3 || username.length > 50) {
            return reply.code(400).send({ 
                error: 'Username must be 3-50 characters' 
            });
        }
        
        if (password.length < 6) {
            return reply.code(400).send({ 
                error: 'Password must be at least 6 characters' 
            });
        }
        
        // Check if username already exists
        const existingUser = db.prepare(
            'SELECT id FROM users WHERE username = ?'
        ).get(username);
        
        if (existingUser) {
            return reply.code(400).send({ 
                error: 'Username already exists' 
            });
        }
        
        // Create admin account
        const passwordHash = bcrypt.hashSync(password, 10);
        const result = db.prepare(
            'INSERT INTO users (username, password_hash, role, is_super_admin) VALUES (?, ?, ?, 1)'
        ).run(username, passwordHash, 'admin');
        
        return {
            success: true,
            message: 'Admin account created successfully',
            userId: result.lastInsertRowid
        };
    });
}

module.exports = initRoutes;
