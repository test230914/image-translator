// 终极修复版 api/translate.js (使用原生 crypto 严格计算签名)
const axios = require('axios');
const crypto = require('crypto'); // 使用 Node 原生加密库
const FormData = require('form-data');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageBase64, from, to, appid, key } = req.body;

    if (!imageBase64 || !appid || !key) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const cleanAppid = appid.trim();
    const cleanKey = key.trim();
    const salt = Date.now().toString();
    
    // 严格截取 base64
    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    
    // 【核心修复】：使用原生 crypto 严格计算 MD5，确保与百度服务器完全一致
    const imageMd5 = crypto.createHash('md5').update(cleanBase64, 'binary').digest('hex');
    const signStr = cleanAppid + imageMd5 + salt + cleanKey;
    const sign = crypto.createHash('md5').update(signStr, 'utf8').digest('hex');

    const formData = new FormData();
    formData.append('from', from);
    formData.append('to', to);
    formData.append('appid', cleanAppid);
    formData.append('salt', salt);
    formData.append('sign', sign);
    formData.append('image', cleanBase64);

    const response = await axios.post('https://fanyi-api.baidu.com/api/trans/sdk/picture', formData, {
      headers: formData.getHeaders(),
      timeout: 20000 // 增加超时时间
    });
    
    if (response.data.error_code && response.data.error_code !== '0' && response.data.error_code !== 0) {
        return res.status(400).json({ 
            error: `百度API报错: ${response.data.error_msg} (Code: ${response.data.error_code})`
        });
    }

    res.status(200).json(response.data);
  } catch (error) {
    let errMsg = error.message;
    if (error.code === 'ECONNABORTED') errMsg = '请求超时';
    res.status(500).json({ error: `服务器内部错误: ${errMsg}` });
  }
};
