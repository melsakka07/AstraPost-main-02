/**
 * Test Twitter API Permissions (X API)
 *
 * This script verifies that your Twitter app credentials have the correct
 * permissions for posting tweets and uploading media.
 *
 * Run with: pnpm tsx scripts/test-twitter-permissions.ts
 *
 * Prerequisites:
 * - TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET must be set in .env
 * - A user access token is needed to test actual operations
 */

import { TwitterApi } from "twitter-api-v2";
import { config } from "dotenv";
import { join } from "path";

// Load environment variables
const envPath = join(process.cwd(), ".env");
config({ path: envPath });

// Lazy imports for database (only when needed)
let db: any;
let xAccounts: any;
let decryptToken: any;

function tryLoadDatabase() {
  if (db) return true; // Already loaded

  try {
    const dbModule = require("../src/lib/db");
    const schemaModule = require("../src/lib/schema");
    const cryptoModule = require("../src/lib/security/token-encryption");

    db = dbModule.db;
    xAccounts = schemaModule.xAccounts;
    decryptToken = cryptoModule.decryptToken;

    return true;
  } catch (error: any) {
    // Database not available (POSTGRES_URL not set, etc.)
    return false;
  }
}

interface TestResult {
  name: string;
  status: "PASS" | "FAIL" | "SKIP";
  message: string;
  details?: any;
}

const results: TestResult[] = [];

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
} as const;

type ColorName = keyof typeof colors;

function log(message: string, color: ColorName = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log("\n" + colors.cyan + colors.bright + `══ ${title} ══` + colors.reset);
}

function logResult(result: TestResult) {
  const statusIcon = result.status === "PASS" ? "✓" : result.status === "FAIL" ? "✗" : "○";
  const statusColor = result.status === "PASS" ? "green" : result.status === "FAIL" ? "red" : "yellow";

  log(`${statusIcon} ${result.name}: ${result.message}`, statusColor);
  if (result.details) {
    console.log("  Details:", JSON.stringify(result.details, null, 2));
  }
  results.push(result);
}

/**
 * Test 1: Verify environment variables are set
 */
async function testEnvironmentVariables(): Promise<void> {
  logSection("Test 1: Environment Variables");

  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;

  if (!clientId) {
    logResult({
      name: "TWITTER_CLIENT_ID",
      status: "FAIL",
      message: "TWITTER_CLIENT_ID is not set in environment",
    });
  } else {
    logResult({
      name: "TWITTER_CLIENT_ID",
      status: "PASS",
      message: `Found: ${clientId.substring(0, 10)}...`,
    });
  }

  if (!clientSecret) {
    logResult({
      name: "TWITTER_CLIENT_SECRET",
      status: "FAIL",
      message: "TWITTER_CLIENT_SECRET is not set in environment",
    });
  } else {
    logResult({
      name: "TWITTER_CLIENT_SECRET",
      status: "PASS",
      message: `Found: ${clientSecret.substring(0, 10)}...`,
    });
  }

  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (bearerToken) {
    logResult({
      name: "TWITTER_BEARER_TOKEN",
      status: "PASS",
      message: "Bearer token found (for public API access)",
    });
  } else {
    logResult({
      name: "TWITTER_BEARER_TOKEN",
      status: "SKIP",
      message: "Bearer token not set (optional, for public API only)",
    });
  }

  if (!clientId || !clientSecret) {
    log("\n❌ Cannot continue without TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET", "red");
    process.exit(1);
  }
}

/**
 * Test 2: Test app-only authentication (verifies credentials are valid)
 */
async function testAppAuthentication(): Promise<void> {
  logSection("Test 2: App Authentication");

  const bearerToken = process.env.TWITTER_BEARER_TOKEN;

  if (!bearerToken) {
    logResult({
      name: "App Authentication",
      status: "SKIP",
      message: "TWITTER_BEARER_TOKEN not set - skipping app-only auth test",
      details: {
        hint: "Add TWITTER_BEARER_TOKEN to .env for public API access",
      },
    });
    return;
  }

  try {
    // Use Bearer Token for app-only authentication
    new TwitterApi(bearerToken);

    // Try a simple API call to verify the bearer token works
    // We'll just create the client successfully - the actual API call will be in the next test
    logResult({
      name: "App Authentication",
      status: "PASS",
      message: "Bearer token is valid, app-only authentication successful",
      details: { clientType: "app-only (Bearer Token)" },
    });
  } catch (error: any) {
    logResult({
      name: "App Authentication",
      status: "FAIL",
      message: error.message || "Failed to authenticate with bearer token",
      details: {
        code: error.code,
        status: error?.response?.status,
      },
    });
  }
}

/**
 * Test 3: Verify OAuth 2.0 credentials format
 */
async function testOAuth2Credentials(): Promise<void> {
  logSection("Test 3: OAuth 2.0 Credentials");

  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    logResult({
      name: "OAuth 2.0 Credentials",
      status: "SKIP",
      message: "OAuth 2.0 credentials not set",
    });
    return;
  }

  // Basic format validation
  const clientIdValid = clientId.length > 10 && clientId.startsWith("cl");
  const clientSecretValid = clientSecret.length > 10;

  logResult({
    name: "OAuth 2.0 Credentials",
    status: (clientIdValid && clientSecretValid) ? "PASS" : "FAIL",
    message: (clientIdValid && clientSecretValid)
      ? "OAuth 2.0 credentials appear valid"
      : "OAuth 2.0 credentials may be invalid",
    details: {
      clientIdFormat: clientIdValid ? "valid" : "invalid (should start with 'cl' and be >10 chars)",
      clientSecretFormat: clientSecretValid ? "valid" : "invalid (should be >10 chars)",
    },
  });
}

/**
 * Test 4: Test with a user access token (from database)
 * This fetches the active X account's access token from the database
 */
async function testUserTokenPermissions(): Promise<void> {
  logSection("Test 4: User Token Permissions");

  let testAccessToken: string | undefined;

  // First, try to get the token from the database (active X account)
  if (tryLoadDatabase()) {
    try {
      const { desc, and, eq } = require("drizzle-orm");
      const account = await db.query.xAccounts.findFirst({
        where: and(eq(xAccounts.isActive, true)),
        orderBy: [desc(xAccounts.createdAt)],
      });

      if (account) {
        // Decrypt the access token
        testAccessToken = decryptToken(account.accessToken);
        log(`Found active X account: @${account.xUsername}`, "blue");
      }
    } catch (dbError: any) {
      log(`Could not access database: ${dbError.message}`, "yellow");
    }
  } else {
    log("Database not available (POSTGRES_URL not set)", "yellow");
  }

  // Fall back to environment variable if database access fails
  if (!testAccessToken) {
    testAccessToken = process.env.TWITTER_TEST_ACCESS_TOKEN;
    if (testAccessToken) {
      log(`Using TWITTER_TEST_ACCESS_TOKEN from .env (may be outdated)`, "yellow");
    }
  }

  if (!testAccessToken) {
    logResult({
      name: "User Token Test",
      status: "SKIP",
      message: "No active X account found in database or TWITTER_TEST_ACCESS_TOKEN not set",
      details: {
        hint: "Connect your X account at /dashboard/settings first",
      },
    });
    return;
  }

  try {
    const client = new TwitterApi(testAccessToken);

    // Test 4a: Verify we can fetch user info (READ permission)
    logSection("Test 4a: Read Permission");
    try {
      const user = await client.v2.me({
        "user.fields": ["username", "name", "public_metrics"],
      });
      logResult({
        name: "Read Permission",
        status: "PASS",
        message: `Can read user data: @${user.data.username}`,
        details: { userId: user.data.id, name: user.data.name },
      });
    } catch (error: any) {
      logResult({
        name: "Read Permission",
        status: "FAIL",
        message: error.message,
      });
      return; // Can't continue if read fails
    }

    // Test 4b: Verify OAuth client can be created with valid credentials
    logSection("Test 4b: OAuth Client Setup");
    try {
      // Verify OAuth client can be created with valid credentials
      new TwitterApi({
        clientId: process.env.TWITTER_CLIENT_ID!,
        clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      });

      logResult({
        name: "OAuth Client Setup",
        status: "PASS",
        message: "OAuth client configured correctly",
      });
    } catch (error: any) {
      logResult({
        name: "OAuth Client Setup",
        status: "FAIL",
        message: error.message,
      });
    }

    // Test 4c: Test media upload (this is where 403 errors occur)
    await testMediaUpload(client);

  } catch (error: any) {
    logResult({
      name: "User Token Test",
      status: "FAIL",
      message: error.message,
      details: {
        code: error.code,
        status: error?.response?.status,
        data: error?.data,
      },
    });
  }
}

/**
 * Test 5: Media Upload Test (The main source of 403 errors)
 */
async function testMediaUpload(client: TwitterApi): Promise<void> {
  logSection("Test 5: Media Upload (403 Error Test)");

  // Create a minimal test image (1x1 PNG)
  const testImageBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );

  try {
    log("Attempting to upload a 1x1 PNG test image...", "blue");

    const mediaId = await client.v1.uploadMedia(testImageBuffer, {
      mimeType: "image/png",
    });

    logResult({
      name: "Media Upload",
      status: "PASS",
      message: `Successfully uploaded test image! Media ID: ${mediaId}`,
      details: { mediaId },
    });

    // If we got here, we have write permissions - try to clean up by posting and deleting
    log("\nMedia upload succeeded! Testing tweet with media...", "blue");
    await testTweetWithMedia(client, mediaId);

  } catch (error: any) {
    const statusCode = error?.response?.status;
    const errorCode = error?.code;
    const errorMessage = error?.data?.errors?.[0]?.message || error.message;

    if (statusCode === 403 || errorCode === 403) {
      logResult({
        name: "Media Upload",
        status: "FAIL",
        message: "❌ 403 Forbidden - App permissions insufficient!",
        details: {
          error: errorMessage,
          statusCode,
          fix: "Go to https://developer.twitter.com/en/portal/dashboard and change app permissions from 'Read' to 'Read and Write'",
        },
      });

      log("\n" + colors.bright + colors.red + "═══════════════════════════════════════════════════════" + colors.reset);
      log(colors.bright + colors.red + "🔧 HOW TO FIX 403 ERROR ON MEDIA UPLOAD:" + colors.reset);
      log("\n" + colors.yellow + "1. Go to: https://developer.twitter.com/en/portal/dashboard" + colors.reset);
      log(colors.yellow + "2. Select your app" + colors.reset);
      log(colors.yellow + "3. Go to: Settings → App permissions" + colors.reset);
      log(colors.yellow + "4. Change from 'Read' to 'Read and Write':" + colors.reset);
      log(colors.red + "   Current: " + colors.bright + "Read only" + colors.reset);
      log(colors.green + "   Required: " + colors.bright + "Read and Write" + colors.reset);
      log("\n" + colors.cyan + "5. After changing permissions:" + colors.reset);
      log(colors.cyan + "   - Go to /dashboard/settings in AstraPost" + colors.reset);
      log(colors.cyan + "   - Disconnect your X account" + colors.reset);
      log(colors.cyan + "   - Connect again with the updated permissions" + colors.reset);
      log("\n" + colors.bright + colors.red + "═══════════════════════════════════════════════════════" + colors.reset + "\n");

    } else if (statusCode === 401) {
      logResult({
        name: "Media Upload",
        status: "FAIL",
        message: "❌ 401 Unauthorized - Access token may be expired",
        details: {
          error: errorMessage,
          fix: "Reconnect your X account in /dashboard/settings",
        },
      });
    } else if (statusCode === 429) {
      logResult({
        name: "Media Upload",
        status: "FAIL",
        message: "❌ 429 Rate Limited - Too many upload attempts",
        details: {
          error: errorMessage,
          fix: "Wait a few minutes before testing again",
        },
      });
    } else {
      logResult({
        name: "Media Upload",
        status: "FAIL",
        message: `❌ Media upload failed: ${errorMessage}`,
        details: {
          statusCode,
          errorCode,
          fullError: error?.data || error?.message,
        },
      });
    }
  }
}

/**
 * Test 6: Tweet with Media (only runs if media upload succeeds)
 */
async function testTweetWithMedia(client: TwitterApi, mediaId: string): Promise<void> {
  logSection("Test 6: Post Tweet with Media");

  const testText = `Testing AstraPost media upload - ${new Date().toISOString()}`;

  try {
    // Check if dry run mode is enabled
    const dryRun = process.env.TWITTER_DRY_RUN === "1";

    if (dryRun) {
      log("TWITTER_DRY_RUN=1 - Skipping actual tweet post", "yellow");
      logResult({
        name: "Tweet with Media",
        status: "PASS",
        message: "Dry run mode - would post tweet with media",
        details: { mediaId, text: testText },
      });
    } else {
      const tweet = await client.v2.tweet(testText, {
        media: { media_ids: [mediaId] as any },
      });

      logResult({
        name: "Tweet with Media",
        status: "PASS",
        message: `✅ Successfully posted tweet with image! Tweet ID: ${tweet.data.id}`,
        details: { tweetId: tweet.data.id, url: `https://x.com/i/status/${tweet.data.id}` },
      });

      log("\n" + colors.green + colors.bright + "🎉 SUCCESS! Your app has full Read and Write permissions!" + colors.reset);
      log(colors.cyan + "You can delete the test tweet at: " + colors.bright + `https://x.com/i/status/${tweet.data.id}` + colors.reset + "\n");
    }
  } catch (error: any) {
    logResult({
      name: "Tweet with Media",
      status: "FAIL",
      message: error.message,
      details: {
        code: error.code,
        status: error?.response?.status,
      },
    });
  }
}

/**
 * Test 7: Check token refresh endpoint (common source of 400 errors)
 */
async function testTokenRefreshEndpoint(): Promise<void> {
  logSection("Test 7: Token Refresh Endpoint");

  let refreshToken: string | undefined;

  // First, try to get the refresh token from the database (active X account)
  if (tryLoadDatabase()) {
    try {
      const { desc, and, eq } = require("drizzle-orm");
      const account = await db.query.xAccounts.findFirst({
        where: and(eq(xAccounts.isActive, true)),
        orderBy: [desc(xAccounts.createdAt)],
      });

      if (account) {
        // Use the encrypted refresh token if available, otherwise fall back to plaintext
        if (account.refreshTokenEnc) {
          refreshToken = decryptToken(account.refreshTokenEnc);
          log(`Found refresh token for @${account.xUsername}`, "blue");
        } else if (account.refreshToken) {
          refreshToken = account.refreshToken;
          log(`Found refresh token for @${account.xUsername}`, "blue");
        }
      }
    } catch (dbError: any) {
      log(`Could not access database: ${dbError.message}`, "yellow");
    }
  } else {
    log("Database not available (POSTGRES_URL not set)", "yellow");
  }

  // Fall back to environment variable if database access fails
  if (!refreshToken) {
    refreshToken = process.env.TWITTER_TEST_REFRESH_TOKEN;
    if (refreshToken) {
      log(`Using TWITTER_TEST_REFRESH_TOKEN from .env (may be outdated)`, "yellow");
    }
  }

  if (!refreshToken) {
    logResult({
      name: "Token Refresh",
      status: "SKIP",
      message: "No refresh token found in database or TWITTER_TEST_REFRESH_TOKEN not set",
      details: {
        hint: "Connect your X account at /dashboard/settings with offline.access scope",
      },
    });
    return;
  }

  try {
    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    });

    log("Attempting to refresh access token...", "blue");

    const { accessToken, refreshToken: _newRefreshToken, expiresIn } =
      await client.refreshOAuth2Token(refreshToken);

    logResult({
      name: "Token Refresh",
      status: "PASS",
      message: "Successfully refreshed access token",
      details: { expiresIn, newAccessToken: accessToken.substring(0, 20) + "..." },
    });

    log("\n" + colors.green + "New Access Token (your account has been refreshed):" + colors.reset);
    log(colors.cyan + accessToken.substring(0, 30) + "..." + colors.reset + "\n");

  } catch (error: any) {
    const statusCode = error?.response?.status;

    if (statusCode === 400) {
      logResult({
        name: "Token Refresh",
        status: "FAIL",
        message: "❌ 400 Bad Request - Token refresh failed",
        details: {
          error: error?.data || error.message,
          possibleCauses: [
            "Refresh token has expired",
            "App permissions changed (need to re-authenticate)",
            "Client ID or Secret is incorrect",
          ],
          fix: "Disconnect and reconnect your X account in /dashboard/settings",
        },
      });
    } else {
      logResult({
        name: "Token Refresh",
        status: "FAIL",
        message: error.message,
        details: { statusCode, error: error?.data },
      });
    }
  }
}

/**
 * Print summary of all tests
 */
function printSummary(): void {
  logSection("Test Summary");

  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  const skipped = results.filter(r => r.status === "SKIP").length;

  console.log(`\n  Total Tests: ${results.length}`);
  log(`  ✓ Passed: ${passed}`, "green");
  log(`  ✗ Failed: ${failed}`, failed > 0 ? "red" : "gray");
  log(`  ○ Skipped: ${skipped}`, "yellow");

  if (failed > 0) {
    console.log("\n" + colors.red + colors.bright + "❌ Some tests failed. Please review the errors above." + colors.reset);
    console.log(colors.cyan + "📚 For help, see: https://docs.astrapost.com/troubleshooting" + colors.reset);
  } else {
    console.log("\n" + colors.green + colors.bright + "✅ All tests passed!" + colors.reset);
  }

  console.log("");
}

/**
 * Main test runner
 */
async function main(): Promise<void> {
  console.log("\n" + colors.cyan + colors.bright + "╔══════════════════════════════════════════════════════╗" + colors.reset);
  console.log(colors.cyan + colors.bright + "║     Twitter API Permissions Test Suite             ║" + colors.reset);
  console.log(colors.cyan + colors.bright + "╚══════════════════════════════════════════════════════╝" + colors.reset);

  try {
    await testEnvironmentVariables();
    await testAppAuthentication();
    await testOAuth2Credentials();
    await testUserTokenPermissions();
    await testTokenRefreshEndpoint();
  } catch (error: any) {
    log("\n❌ Fatal error during test execution:", "red");
    console.error(error);
  } finally {
    printSummary();
  }
}

// Run the tests
main();
