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
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 去除可能存在的空格
    const cleanAppid = appid.trim();
    const cleanKey = key.trim();

    const salt = Date.now().toString();
    
    // 优化 base64 截取，防止正则失效导致 MD5 算错
    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    
    // 计算签名
    const imageMd5 = md5(cleanBase64);
    const sign = md5(cleanAppid + imageMd5 + salt + cleanKey);

    const formData = new FormData();
    formData.append('from', from);
    formData.append('to', to);
    formData.append('appid', cleanAppid);
    formData.append('salt', salt);
    formData.append('sign', sign);
    formData.append('image', cleanBase64);

    const response = await axios.post('https://fanyi-api.baidu.com/api/trans/sdk/picture', formData, {
      headers: formData.getHeaders(),
      timeout: 15000 
    });
    
    if (response.data.error_code && response.data.error_code !== '0' && response.data.error_code !== 0) {
        // 【新增】返回调试信息，帮助排查 54001
        return res.status(400).json({ 
            error: `百度API报错: ${response.data.error_msg} (Code: ${response.data.error_code})`,
            debug: {
                appid_len: cleanAppid.length,
                key_len: cleanKey.length,
                appid_is_num: /^\d+$/.test(cleanAppid)
            }
        });
    }

    res.status(200).json(response.data);
  } catch (error) {
    let errMsg = error.message;
    if (error.code === 'ECONNABORTED') errMsg = '请求超时，请尝试上传尺寸更小的图片';
    res.status(500).json({ error: `服务器内部错误: ${errMsg}` });
  }
};
