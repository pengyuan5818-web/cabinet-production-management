/**
 * 语音播报服务（MiniMax TTS）
 * 文字转语音 + 扬声器播放
 */
const https = require('https');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const logger = require('../utils/logger');

const TTS_CONFIG = {
  apiKey: process.env.MINIMAX_API_KEY || 'sk-cp-1Wf0_6c5zjqFC2M6d9oXDYkNNADPJYGJQMFUXXOY_LFcBVpCpjfminWcH9nDnTWbAyV9J-usVUsUux6gztokz6vLvSg2OZwWZ_IoVnX8UYn8LRr38lADWws',
  groupId: process.env.MINIMAX_GROUP_ID || '1235080',
  baseUrl: 'https://api.minimaxi.chat/v1',
  voiceId: process.env.TTS_VOICE_ID || 'female-tianmei',
};

const PLAYER_CMD = os.platform() === 'win32'
  ? 'powershell -c "(New-Object System.Media.SoundPlayer).SoundLocation=\'%s\'; (New-Object System.Media.SoundPlayer).PlaySync()"'
  : 'aplay "%s" 2>/dev/null || true';

class VoiceService {
  constructor() {
    this.enabled = process.env.VOICE_ENABLED !== 'false';
    this.cacheDir = path.join(os.tmpdir(), 'cabinet-tts');
    if (!fs.existsSync(this.cacheDir)) fs.mkdirSync(this.cacheDir, { recursive: true });
  }

  /**
   * 文字转语音并播放
   * @param {string} text - 播报文字（建议30字以内）
   */
  async speak(text) {
    if (!this.enabled) return;
    if (!text || !text.trim()) return;

    // 缓存key
    const textMd5 = require('crypto')
      .createHash('md5').update(text).digest('hex');
    const audioFile = path.join(this.cacheDir, `${textMd5}.wav`);

    try {
      // 1. 有缓存直接播放
      if (fs.existsSync(audioFile)) {
        await this._play(audioFile);
        return;
      }

      // 2. 调用 MiniMax TTS
      const audioData = await this._tts(text);
      fs.writeFileSync(audioFile, Buffer.from(audioData, 'hex'));

      // 3. 播放
      await this._play(audioFile);
      logger.info(`[Voice] 播报: ${text}`);

    } catch (err) {
      logger.error(`[Voice] 播报失败 [${text}]:`, err.message);
    }
  }

  async _tts(text) {
    const payload = {
      model: 'speech-2.8-hd',
      text: text.slice(0, 200), // 限制长度
      voice_setting: {
        voice_id: TTS_CONFIG.voiceId,
        speed: 1.0,
        volume: 1.0,
        pitch: 0
      },
      output_format: 'wav'
    };

    const bodyStr = JSON.stringify(payload);

    return new Promise((resolve, reject) => {
      const url = new URL(`${TTS_CONFIG.baseUrl}/t2a_v2`);
      const opts = {
        hostname: url.hostname,
        port: 443,
        path: `${url.pathname}?GroupId=${TTS_CONFIG.groupId}`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TTS_CONFIG.apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr)
        }
      };

      const req = https.request(opts, (res) => {
        if (res.statusCode !== 200) {
          let body = '';
          res.on('data', c => { body += c; });
          res.on('end', () => reject(new Error(`TTS API错误 ${res.statusCode}: ${body}`)));
          return;
        }
        const chunks = [];
        res.on('data', c => { chunks.push(c); });
        res.on('end', () => {
          const data = JSON.parse(Buffer.concat(chunks).toString());
          if (data.data?.audio) {
            resolve(data.data.audio);
          } else {
            reject(new Error('TTS返回格式错误: ' + JSON.stringify(data)));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => { req.destroy(); reject(new Error('TTS请求超时')); });
      req.write(bodyStr);
      req.end();
    });
  }

  async _play(filePath) {
    return new Promise((resolve, reject) => {
      const cmd = PLAYER_CMD.replace('%s', filePath.replace(/'/g, "''"));
      exec(cmd, { timeout: 15000 }, (err) => {
        if (err && !err.killed) {
          logger.warn(`音频播放失败: ${err.message}`);
        }
        resolve();
      });
    });
  }

  /**
   * 快速播报（不带缓存，适合生产环境）
   */
  async quickSpeak(text) {
    return this.speak(text);
  }
}

module.exports = { VoiceService };
