import chalk from 'chalk';
import { getConfig } from '../config.js';
import { loadCredentials } from '../auth.js';
import { createClient } from '../api.js';
import { pickMessage } from '../i18n.js';

const M = {
  noToken: {
    zh: '未登录：本地没有保存访问令牌。请执行 skb login。',
    en: 'Not logged in: no saved access token. Run skb login.'
  },
  invalid: {
    zh: '登录无效或已过期：',
    en: 'Login invalid or expired: '
  },
  network: {
    zh: '无法连接 Skill Base：',
    en: 'Cannot reach Skill Base: '
  }
};

function outJson(obj) {
  console.log(JSON.stringify(obj));
}

export default async function whoami(options) {
  const quiet = Boolean(options.quiet);
  const json = Boolean(options.json);
  const { baseUrl } = getConfig();
  const cred = loadCredentials();

  if (!cred?.token) {
    if (json) {
      outJson({ ok: false, reason: 'no_token', baseUrl, detail: pickMessage(M.noToken) });
    } else if (!quiet) {
      console.error(chalk.red(pickMessage(M.noToken)));
    }
    process.exit(1);
  }

  const client = createClient();
  try {
    const me = await client.get('/auth/me');
    const username = me.username || cred.username || '?';
    const role = me.role ?? '?';

    if (json) {
      outJson({
        ok: true,
        baseUrl,
        user: {
          id: me.id,
          username: me.username,
          name: me.name ?? null,
          role: me.role,
          is_super_admin: me.is_super_admin
        }
      });
      return;
    }

    if (!quiet) {
      console.log(
        chalk.green(
          pickMessage({
            zh: `已登录 · 用户 ${username} · 角色 ${role} · 服务 ${baseUrl}`,
            en: `Logged in as ${username} · role ${role} · server ${baseUrl}`
          })
        )
      );
    }
  } catch (err) {
    const msg = err.message || String(err);
    const isAuth = /401|403|Authentication|invalid|Unauthorized/i.test(msg);

    if (json) {
      outJson({
        ok: false,
        reason: isAuth ? 'invalid_token' : 'request_failed',
        baseUrl,
        detail: msg
      });
    } else if (!quiet) {
      const prefix = isAuth ? pickMessage(M.invalid) : pickMessage(M.network);
      console.error(chalk.red(`${prefix}${msg}`));
    }
    process.exit(1);
  }
}
