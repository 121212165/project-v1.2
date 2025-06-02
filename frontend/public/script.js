// 文本分析功能
async function analyzeText() {
    const text = document.getElementById('textContent').value;
    const analysisResultsDiv = document.getElementById('analysisResults');
    const modificationSuggestionsDiv = document.getElementById('modificationSuggestions');
    const resourceRecommendationsDiv = document.getElementById('resourceRecommendations');

    // 清空旧结果
    analysisResultsDiv.innerHTML = '<p>分析中，请稍候...</p>';
    modificationSuggestionsDiv.innerHTML = '';
    resourceRecommendationsDiv.innerHTML = '';

    if (!text.trim()) {
        analysisResultsDiv.innerHTML = '<p>请输入内容后再进行分析。</p>';
        return;
    }

    try {
        const response = await fetch('/api/analyze-text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text })
        });

        const result = await response.json();

        if (result.success) {
            displayAnalysisResults(result.data);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        analysisResultsDiv.innerHTML = `<p style="color: red;">分析失败: ${error.message}</p>`;
    }
}

// 图文分析功能
async function analyzeImageAndText() {
    const imageFile = document.getElementById('imageUpload').files[0];
    const text = document.getElementById('imageRelatedText').value;
    const resultsDiv = document.getElementById('imageAnalysisResults');

    resultsDiv.innerHTML = '<p>分析中，请稍候...</p>';

    if (!imageFile) {
        resultsDiv.innerHTML = '<p>请先上传图片。</p>';
        return;
    }

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('text', text);

    try {
        const response = await fetch('/api/analyze-image-text', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            displayImageAnalysisResults(result.data);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        resultsDiv.innerHTML = `<p style="color: red;">分析失败: ${error.message}</p>`;
    }
}

// 显示分析结果
function displayAnalysisResults(data) {
    // ... existing code ...
    // 这里实现结果展示逻辑，基于AI返回的JSON数据
}