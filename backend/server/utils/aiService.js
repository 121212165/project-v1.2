import { createSDK } from 'dashscope-node';

// 配置模型名称常量
const MODELS = {
    TEXT_ANALYSIS: 'qwen-turbo',
    IMAGE_ANALYSIS: 'qwen-vl-plus'
};

const DashScopeAPI = createSDK({
    accessToken: process.env.DASHSCOPE_TOKEN,
});

export class AIService {
    // 文本分析服务
    static async analyzeText(text) {
        const systemPrompt = `
你是一个专业的美妆文案审查助手，具有丰富的美妆行业知识和文案审核经验。请仔细分析以下美妆相关文本内容，重点关注：

1. 文字质量检查
   - 错别字、标点符号使用
   - 语法结构和表达流畅度
   - 专业术语使用是否准确

2. 合规性审查
   - 违禁词和敏感用语
   - 夸大宣传和虚假承诺
   - 产品功效描述是否符合监管要求
   - 是否符合广告法相关规定

3. 内容优化建议
   - 用词精准性和吸引力
   - 文案结构和逻辑性
   - 目标受众契合度
   - 品牌调性匹配度

4. 营销效果提升
   - 卖点突出程度
   - 说服力和感染力
   - 互动引导设计
   - 转化率优化建议

请以JSON格式返回分析结果：
{
    "errors": [{"type": "typo/forbidden", "text": "问题文本", "suggestion": "建议", "reason": "原因"}],
    "suggestions": [{"original": "原文", "improved": "改进版", "reason": "改进原因"}],
    "compliance": {"score": 85, "issues": ["问题列表"]},
    "resources": ["相关资料推荐"]
}`;

        try {
            const result = await DashScopeAPI.chat.completion.request({
                model: MODELS.TEXT_ANALYSIS,
                input: {
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: `请分析这段美妆文案：\n\n${text}` }
                    ]
                },
                parameters: {
                    temperature: 0.7
                }
            });
            return JSON.parse(result.output.text);
        } catch (error) {
            console.error('AI分析失败:', error?.response?.data || error.message || error);
            throw new Error('AI分析服务暂时不可用');
        }
    }

    // 图文分析服务
    static async analyzeImageAndText(imageUrl, text) {
        const systemPrompt = `
你是一个专业的美妆图文内容审查助手。请分析图片和文字内容，检测：

1. 图文是否一致
2. 图片中是否有违规内容
3. 文字描述是否准确
4. 整体合规性评估

请以JSON格式返回结果：
{
    "imageAnalysis": {
        "compliance": {"status": "合规/不合规", "issues": []},
        "quality": {"score": 85, "suggestions": []}
    },
    "textAnalysis": {
        "accuracy": {"score": 90, "issues": []},
        "suggestions": []
    },
    "overall": {
        "consistency": {"score": 85, "issues": []},
        "recommendations": []
    }
}`;

        try {
            const result = await DashScopeAPI.chat.completion.request({
                model: MODELS.IMAGE_ANALYSIS,
                input: {
                    messages: [
                        { role: "system", content: systemPrompt },
                        {
                            role: "user",
                            content: [
                                { type: "text", text: `请分析以下图片和文字内容：\n\n${text}` },
                                { type: "image_url", image_url: { url: imageUrl } }
                            ]
                        }
                    ]
                },
                parameters: {
                    temperature: 0.7
                }
            });
            return JSON.parse(result.output.text);
        } catch (error) {
            console.error('图文分析失败:', error?.response?.data || error.message || error);
            throw new Error('图文分析服务暂时不可用');
        }
    }
}