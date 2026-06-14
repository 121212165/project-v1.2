# Reconstruction Plan

## Core Problem
A cosmetics company needs to check whether marketing content complies with Chinese advertising regulations. That's: prompt in, compliant rewrite out.

## Current State: ~6000+ lines
- Factory pattern for a single AI provider (AIServiceFactory + DeepSeekAdapter + BaiLianAdapter + IAnalysisService = ~1700 lines)
- Monitoring services (PerformanceMonitoring + CostMonitoring = ~1680 lines)
- Dead services (SMS, WeChat = ~300 lines)
- Duplicate frontend API layer (api.ts + apiFactory.ts)
- Hardcoded API keys in 14 files
- Test scripts, docs, docker configs = noise

## Target State: ~1500 lines in ~15 files

### KEEP (modified)
1. `backend/src/config/index.ts` - strip hardcoded keys, remove SMS/WeChat config
2. `backend/src/types/index.ts` - trim to essentials
3. `backend/src/utils/logger.ts` - keep as-is
4. `backend/src/services/promptService.ts` - keep as-is (core business logic)
5. `backend/src/services/cacheService.ts` - simplify to ~80 lines
6. `backend/src/services/session.service.ts` - keep as-is
7. `backend/src/services/database.service.ts` - keep AnalysisTaskService only
8. `backend/src/middleware/auth.ts` - simplify
9. `backend/src/middleware/index.ts` - simplify
10. `backend/src/routes/auth.ts` - keep email/password only, strip WeChat/SMS
11. `backend/src/routes/analyze.ts` - simplify
12. `backend/src/routes/history.ts` - keep as-is
13. `backend/src/routes/deepseek.ts` - keep as-is
14. `backend/src/controllers/analyzeController.ts` - rewrite direct (no factory)
15. `backend/src/controllers/historyController.ts` - keep as-is
16. `backend/src/app.ts` - simplify
17. `backend/prisma/schema.prisma` - keep as-is
18. `backend/package.json` - keep as-is
19. `frontend/` - keep all existing frontend files (they're clean)
20. `.env.example` - strip hardcoded keys
21. `.gitignore` - keep as-is

### DELETE
- `backend/src/services/factory/` (AIServiceFactory.ts) - 364 lines
- `backend/src/services/adapters/` (DeepSeekAdapter.ts, BaiLianAdapter.ts) - 1165 lines
- `backend/src/services/interfaces/` (IAnalysisService.ts) - 170 lines
- `backend/src/services/monitoring/` (PerformanceMonitoringService.ts, CostMonitoringService.ts) - 1682 lines
- `backend/src/services/sms.service.ts` - 214 lines
- `backend/src/services/wechat.service.ts` - 88 lines
- `backend/src/services/conversationService.ts` - 387 lines
- `backend/src/services/aiService.ts` - 828 lines (replace with direct OpenAI call)
- `backend/src/services/index.ts` - rewrite
- `backend/src/services/analysisTaskService.ts` - merge into database.service.ts
- `backend/src/utils/` (taskHelpers, statsHelpers, sessionManager, responseHandler, inputValidator, healthChecker, fileHelpers, fileHandler, errorHandler, analysisTaskHandler) - ~10 files
- `backend/src/config/database.ts`, `db-pool.ts` - merge into config/index.ts
- `backend/src/middleware/validation.ts` - merge into middleware/index.ts
- `backend/src/controllers/analyzeController.ts` - rewrite
- Root test files: openai_test.py, beauty_ai_test.py, test_ai_services.py, backend_health_check.py, test_api_endpoints.py, test_register.js, test-api.js, test_register_api.ps1
- Root docs: PERFORMANCE_OPTIMIZATION.md, openrouter-optimization-summary.md, 全栈独立开发者任务清单.md, 重建行动任务表.md
- `api-integration-plugin/` - entire directory
- `docker/` - entire directory
- `scripts/` - entire directory
- `docs/` - entire directory
- `query`, `opeenrouter` - junk files
- `backend/create_founder.js`, `backend/test-seed.js`
- `frontend/src/services/apiFactory.ts` - duplicate of api.ts
- `package.json` (root) - unnecessary
- `package-lock.json` (root) - unnecessary

### CRITICAL: Remove hardcoded API key `8e28ff44-9e3e-4e88-911c-7e0485cf90d3` from ALL files

## Lines Saved
- Factory/adapter/interfaces: ~1700 lines
- Monitoring: ~1680 lines
- Dead services: ~690 lines
- Utils/helpers: ~800 lines
- Test scripts/docs: ~1000+ lines
- Config consolidation: ~200 lines
- Total cut: ~6000+ lines → ~1500 lines
