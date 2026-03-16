# Latest Updates

## 2026-03-16: Replicate API Integration Fix

### Fixed 422 Unprocessable Entity Error
- **Issue**: Image generation was failing with `{"detail":"- version is required\n- Additional property model is not allowed\n"}`.
- **Root Cause**: The application was sending the `model` parameter in the body to the generic `/v1/predictions` endpoint, which expects a `version` hash and does not allow `model`.
- **Resolution**: Updated `src/lib/services/ai-image.ts` to use the model-specific endpoint `POST /v1/models/{owner}/{name}/predictions`. This endpoint correctly handles requests using the model name (always using the latest version) and does not require `version` or accept `model` in the body.
- **Verification**: Ran `pnpm test src/lib/services/__tests__/ai-image.test.ts` - all tests passed.
- **Documentation**: Updated `docs/technical/logs-and-issues/ai-image-replicate-fix.md` with detailed logs and solution.

### Next Steps
- Monitor Replicate usage to ensure the new endpoint integration is stable.
- Consider adding an integration test that hits the real Replicate API (with a mocked response or in a separate test suite) to verify contract compliance if issues persist.
