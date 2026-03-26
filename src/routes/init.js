const bcrypt = require('bcryptjs');
const db = require('../database');

/**
 * 系统初始化路由
 * @param {import('fastify').FastifyInstance} fastify
 */
async function initRoutes(fastify) {
    /**
     * GET /api/v1/init/status
     * 检查系统是否需要初始化（是否存在管理员用户）
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
     * 初始化系统管理员账号
     * Body: { username, password }
     */
    fastify.post('/setup', async (request, reply) => {
        // 检查是否已经初始化
        const adminCount = db.prepare(
            "SELECT COUNT(*) as count FROM users WHERE role = 'admin'"
        ).get();
        
        if (adminCount.count > 0) {
            return reply.code(400).send({ 
                error: 'System already initialized' 
            });
        }
        
        const { username, password } = request.body || {};
        
        // 验证输入
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
        
        // 检查用户名是否已存在
        const existingUser = db.prepare(
            'SELECT id FROM users WHERE username = ?'
        ).get(username);
        
        if (existingUser) {
            return reply.code(400).send({ 
                error: 'Username already exists' 
            });
        }
        
        // 创建管理员账号
        const passwordHash = bcrypt.hashSync(password, 10);
        const result = db.prepare(
            'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
        ).run(username, passwordHash, 'admin');
        
        return {
            success: true,
            message: 'Admin account created successfully',
            userId: result.lastInsertRowid
        };
    });
}

module.exports = initRoutes;
