const axios = require('axios');
const md5 = require('md5');
const FormData = require('form-data');

module.exports = async (req, res) => {
  // 允许跨域
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, from, to, appid, key } = req.body;

  if (!imageBase64 || !appid || !key) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const salt = Date.now().toString();
  // 百度图片翻译签名规则
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

  try {
    const response = await axios.post('https://fanyi-api.baidu.com/api/trans/sdk/picture', formData, {
      headers: formData.getHeaders(),
      timeout: 15000 // 15秒超时
    });
    
    if (response.data.error_code && response.data.error_code !== '0') {
        return res.status(400).json({ error: `百度API报错: ${response.data.error_msg}` });
    }

    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
};
