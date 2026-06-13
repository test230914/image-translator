const axios = require('axios');
const md5 = require('md5');
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
      return res.status(400).json({ error: '缺少必要参数 (图片、APPID或密钥)' });
    }

    const salt = Date.now().toString();
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageMd5 = md5(cleanBase64);
    const sign = md5(appid + imageMd5 + salt + key);

    const formData = new FormData();
    formData.append('from', from);
    formData.append('to', to);
    formData.append('appid', appid);
    formData.append('salt', salt);
    formData.append('sign', sign);
    formData.append('image', cleanBase64);

    // 增加超时时间到 15 秒
    const response = await axios.post('https://fanyi-api.baidu.com/api/trans/sdk/picture', formData, {
      headers: formData.getHeaders(),
      timeout: 15000 
    });
    
    if (response.data.error_code && response.data.error_code !== '0' && response.data.error_code !== 0) {
        return res.status(400).json({ error: `百度API报错: ${response.data.error_msg} (Code: ${response.data.error_code})` });
    }

    // 确保返回的是标准 JSON
    res.status(200).json(response.data);
  } catch (error) {
    // 捕获所有未知错误，强制返回 JSON，防止前端解析报错
    let errMsg = error.message;
    if (error.code === 'ECONNABORTED') errMsg = '请求超时，请尝试压缩图片或稍后重试';
    res.status(500).json({ error: `服务器内部错误: ${errMsg}` });
  }
};
