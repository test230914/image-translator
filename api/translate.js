const tencentcloud = require('tencentcloud-sdk-nodejs');
const TmtClient = tencentcloud.tmt.v20180321.Client;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageBase64, from, to, secretId, secretKey } = req.body;

    if (!imageBase64 || !secretId || !secretKey) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 初始化腾讯云客户端 (使用官方 SDK，自动处理所有复杂的签名算法)
    const client = new TmtClient({
      credential: { secretId: secretId.trim(), secretKey: secretKey.trim() },
      region: "ap-guangzhou",
      profile: { httpProfile: { endpoint: "tmt.tencentcloudapi.com" } }
    });

    // 去除 base64 前缀
    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

    // 语言代码映射 (腾讯云的语言代码与百度略有不同)
    const langMap = { 'auto': 'auto', 'zh': 'zh', 'en': 'en', 'ru': 'ru', 'spa': 'es', 'pt': 'pt', 'jp': 'ja' };
    const sourceLang = langMap[from] || 'auto';
    const targetLang = langMap[to] || 'zh';

    // 调用腾讯云图片翻译 API
    const response = await client.ImageTranslation({
      Source: sourceLang,
      Target: targetLang,
      ProjectId: 0,
      Data: cleanBase64
    });

    if (response.Error) {
      return res.status(400).json({ error: `腾讯云API报错: ${response.Error.Message} (Code: ${response.Error.Code})` });
    }

    // 腾讯云返回的 ImageData 就是翻译后的 base64 图片
    res.status(200).json({ 
      data: { pasteImg: response.ImageData } 
    });

  } catch (error) {
    res.status(500).json({ error: `服务器内部错误: ${error.message}` });
  }
};
