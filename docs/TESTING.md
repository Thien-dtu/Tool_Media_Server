# Testing Guide

## Overview

This guide covers the testing strategy, tools, and best practices for the media downloader application. It includes unit tests, integration tests, and end-to-end tests for both backend and frontend components.

## Testing Stack

### Backend
- **Jest**: Test framework and test runner
- **Node.js Built-in Assert**: Assertions
- **SQLite in-memory**: Database testing
- **Mocking**: jest.fn(), jest.mock()

### Frontend
- **Vitest** (planned): React component testing
- **Testing Library** (planned): React testing utilities
- **MSW** (planned): API mocking

## Test Structure

```
tests/
├── unit/
│   ├── utils/
│   │   ├── userFetching.test.js       ✅ Implemented
│   │   ├── concurrencyUtils.test.js   ⏳ Pending
│   │   ├── retryUtils.test.js         ⏳ Pending
│   │   └── mediaUtils.test.js         ⏳ Pending
│   ├── controllers/
│   │   ├── downloadController.test.js ⏳ Pending
│   │   ├── cursorController.test.js   ⏳ Pending
│   │   └── reportController.test.js   ⏳ Pending
│   └── database/
│       └── db-v2.test.js               ⏳ Pending
├── integration/
│   ├── api/
│   │   ├── reports.test.js            ⏳ Pending
│   │   └── users.test.js              ⏳ Pending
│   └── controllers/
│       └── fullFlow.test.js           ⏳ Pending
└── e2e/
    ├── home.test.js                   ⏳ Pending
    └── batch.test.js                  ⏳ Pending
```

## Running Tests

### All Tests
```bash
npm run test:unit           # Run all unit tests
npm run test:integration    # Run integration tests (planned)
npm run test:e2e           # Run E2E tests (planned)
npm test                    # Run all tests
```

### Specific Test Files
```bash
# Run single test file
npm run test:unit -- tests/unit/utils/userFetching.test.js

# Run tests matching pattern
npm run test:unit -- --testNamePattern="getOrFetchUser"

# Run tests in watch mode
npm run test:unit -- --watch
```

### Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html  # macOS
start coverage/lcov-report/index.html # Windows
```

## Coverage Thresholds

### Global Thresholds (Target)
```javascript
global: {
  branches: 95,
  functions: 95,
  lines: 95,
  statements: 95
}
```

### Per-File Thresholds
```javascript
'src/utils/userFetching.js': {
  branches: 85,
  functions: 100,
  lines: 90,
  statements: 90
}
```

### Current Coverage

| File | Statements | Branches | Functions | Lines | Status |
|------|-----------|----------|-----------|-------|--------|
| userFetching.js | 90.42% | 80.82% | 100% | 90.42% | ✅ Pass |
| Other files | TBD | TBD | TBD | TBD | ⏳ Pending |

## Unit Tests

### Example: userFetching.test.js

**Location:** `tests/unit/utils/userFetching.test.js`

**Coverage:** 90.42% statements, 80.82% branches, 100% functions

**Test Structure:**
```javascript
describe('userFetching', () => {
  let mockDb;
  let mockClient;

  beforeEach(() => {
    // Setup mocks
    mockDb = {
      db: {},
      connect: jest.fn().mockImplementation(async function() {
        this.db = { mockConnection: true };
      }),
      close: jest.fn().mockImplementation(function() {
        this.db = null;
      }),
      getUserByUsername: jest.fn(),
      getUserByUid: jest.fn(),
      getOrCreateUser: jest.fn(),
      updateUsername: jest.fn()
    };

    mockClient = {
      fetch: jest.fn()
    };

    // Mock dependencies
    getDatabase.mockReturnValue(mockDb);
    WebSocketRPCClient.mockReturnValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrFetchUser', () => {
    it('should return user from database if exists with UID (fast path)', async () => {
      // Arrange
      const mockUser = {
        id: 1,
        uid: '12345678',
        username: 'testuser',
        platform_name: 'instagram'
      };
      mockDb.getUserByUsername.mockResolvedValue(mockUser);

      // Act
      const result = await getOrFetchUser('https://instagram.com/testuser', null, 'test_client');

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockDb.getUserByUsername).toHaveBeenCalledWith('testuser');
      expect(mockClient.fetch).not.toHaveBeenCalled();
    });

    it('should fetch from API if user not in database (slow path)', async () => {
      // Arrange
      mockDb.getUserByUsername.mockResolvedValue(null);
      mockClient.fetch.mockResolvedValue({
        result: { uid: '12345678', username: 'testuser' }
      });

      // Act
      const result = await getOrFetchUser('https://instagram.com/testuser', null, 'test_client');

      // Assert
      expect(mockClient.fetch).toHaveBeenCalled();
      expect(mockDb.getOrCreateUser).toHaveBeenCalled();
    });
  });
});
```

### Writing Unit Tests

**Best Practices:**

1. **Mock External Dependencies**
   ```javascript
   jest.mock('../../database/db-v2');
   jest.mock('../../src/ws/websocket');
   ```

2. **Use Descriptive Test Names**
   ```javascript
   // Good
   it('should return user from database if exists with UID (fast path)')

   // Bad
   it('test getOrFetchUser')
   ```

3. **Follow AAA Pattern**
   ```javascript
   // Arrange
   const mockData = { ... };
   mockFunction.mockResolvedValue(mockData);

   // Act
   const result = await functionUnderTest();

   // Assert
   expect(result).toEqual(mockData);
   ```

4. **Test Both Success and Error Cases**
   ```javascript
   it('should handle successful fetch')
   it('should handle API errors')
   it('should handle database errors')
   ```

5. **Test Edge Cases**
   ```javascript
   it('should handle empty input')
   it('should handle null values')
   it('should handle malformed URLs')
   ```

## Integration Tests

### Example: API Routes Integration Test

**Location:** `tests/integration/api/users.test.js` (planned)

```javascript
const request = require('supertest');
const app = require('../../../src/app');
const { getDatabase } = require('../../../database/db-v2');

describe('User API Integration', () => {
  let db;

  beforeAll(async () => {
    db = getDatabase();
    await db.connect();
    // Setup test data
  });

  afterAll(async () => {
    // Cleanup
    await db.close();
  });

  describe('GET /api/db/users/stats', () => {
    it('should return user statistics', async () => {
      const response = await request(app)
        .get('/api/db/users/stats')
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.users)).toBe(true);
    });
  });

  describe('POST /api/db/users/fetch', () => {
    it('should fetch user with UID', async () => {
      const response = await request(app)
        .post('/api/db/users/fetch')
        .send({
          url: 'https://instagram.com/testuser',
          clientId: 'test_client_123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('cached');
    });
  });
});
```

## E2E Tests

### Example: Home Page E2E Test

**Location:** `tests/e2e/home.test.js` (planned)

```javascript
describe('Home Page E2E', () => {
  beforeEach(() => {
    cy.visit('http://localhost:5173');
  });

  it('should load database section', () => {
    cy.contains('📊 Database Reports & Users').should('be.visible');
  });

  it('should toggle database section', () => {
    cy.contains('▶ Hiện').click();
    cy.contains('User Info Section').should('be.visible');

    cy.contains('▼ Ẩn').click();
    cy.contains('User Info Section').should('not.be.visible');
  });

  it('should search for user', () => {
    cy.contains('▶ Hiện').click();
    cy.get('input[placeholder*="username"]').type('testuser');
    cy.contains('🔍 Tìm kiếm').click();

    cy.contains('User đã tồn tại', { timeout: 5000 }).should('be.visible');
  });

  it('should fetch user UID', () => {
    cy.contains('▶ Hiện').click();
    cy.get('input[placeholder*="username"]').type('newuser');
    cy.contains('🔍 Tìm kiếm').click();

    cy.contains('🔑 Fetch UID', { timeout: 5000 }).click();
    cy.contains('UID:', { timeout: 10000 }).should('be.visible');
  });
});
```

## Mocking Strategies

### Database Mocking

```javascript
const mockDb = {
  db: {},
  connect: jest.fn().mockImplementation(async function() {
    this.db = { mockConnection: true };
  }),
  close: jest.fn().mockImplementation(function() {
    this.db = null;
  }),
  getUserByUsername: jest.fn(),
  getUserByUid: jest.fn(),
  getOrCreateUser: jest.fn(),
  updateUsername: jest.fn(),
  saveMedia: jest.fn(),
  isMediaSaved: jest.fn(),
  getCursor: jest.fn(),
  saveCursor: jest.fn(),
  saveReport: jest.fn(),
  getRecentReports: jest.fn()
};

jest.mock('../../database/db-v2', () => ({
  getDatabase: jest.fn(() => mockDb)
}));
```

### API Client Mocking

```javascript
const mockClient = {
  fetch: jest.fn().mockResolvedValue({
    result: { uid: '12345678', username: 'testuser' }
  })
};

jest.mock('../../src/ws/websocket', () => ({
  WebSocketRPCClient: jest.fn(() => mockClient)
}));
```

### Frontend API Mocking (MSW)

```javascript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/db/reports/recent', (req, res, ctx) => {
    return res(
      ctx.json({
        reports: [
          {
            apiName: 'get_list_ig_post',
            report: [{ username: 'test', total: 10 }],
            timestamp: new Date().toISOString()
          }
        ]
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Test Data Management

### Test Fixtures

**Location:** `tests/fixtures/`

```javascript
// tests/fixtures/users.js
module.exports = {
  validUser: {
    id: 1,
    uid: '12345678',
    username: 'testuser',
    platform_name: 'instagram',
    profile_url: 'https://instagram.com/testuser'
  },

  userWithoutUid: {
    id: 2,
    uid: null,
    username: 'nouiduser',
    platform_name: 'facebook'
  },

  apiResponse: {
    result: {
      uid: '12345678',
      username: 'testuser',
      platform: 'instagram'
    }
  }
};
```

### Test Database

For integration tests, use an in-memory SQLite database:

```javascript
const { getDatabase } = require('../database/db-v2');

beforeAll(async () => {
  process.env.DATABASE_URL = ':memory:';
  const db = getDatabase();
  await db.connect();
  await db.runMigrations();
});
```

## Debugging Tests

### Visual Debugging

```bash
# Run tests with verbose output
npm run test:unit -- --verbose

# Run specific test with console output
npm run test:unit -- --testNamePattern="specific test" --verbose
```

### Debug Mode

```javascript
// Add debugging breakpoints
it('should test something', async () => {
  debugger; // Breakpoint
  const result = await functionUnderTest();
  console.log('Result:', result);
  expect(result).toBeTruthy();
});
```

### VS Code Debug Configuration

`.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": [
        "--runInBand",
        "--no-cache",
        "--watchAll=false"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

## Continuous Integration

### GitHub Actions (Planned)

`.github/workflows/test.yml`:
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2

    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm ci

    - name: Run unit tests
      run: npm run test:unit

    - name: Run integration tests
      run: npm run test:integration

    - name: Generate coverage report
      run: npm run test:coverage

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v2
```

## Test Maintenance

### Keeping Tests Green

1. **Run tests before commit**
   ```bash
   npm run test:unit
   ```

2. **Fix failing tests immediately**
   - Don't let tests stay broken
   - Fix or skip with `it.skip()` and create issue

3. **Update tests with code changes**
   - Refactoring code? Update tests
   - New features? Add tests

4. **Review test coverage**
   ```bash
   npm run test:coverage
   ```

### Handling Flaky Tests

1. **Identify flaky tests**
   - Run test multiple times: `npm run test:unit -- --testNamePattern="flaky test" --runInBand`

2. **Common causes**
   - Timing issues (use proper async/await)
   - Shared state between tests
   - External dependencies
   - Race conditions

3. **Fixes**
   - Add proper cleanup in `afterEach`
   - Use `jest.useFakeTimers()` for time-dependent code
   - Mock external dependencies
   - Use `waitFor` or `waitForElementToBeRemoved`

## Performance Testing

### Benchmark Tests (Planned)

```javascript
describe('Performance Tests', () => {
  it('should fetch 100 users in under 1 second', async () => {
    const start = Date.now();

    await bulkFetchUsers({
      urls: generateUrls(100),
      clientId: 'test',
      concurrency: 10
    });

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000);
  });
});
```

## Test Naming Conventions

### Structure
```
describe('ComponentName or FunctionName', () => {
  describe('methodName or featureName', () => {
    it('should do something in specific condition', () => {
      // Test
    });
  });
});
```

### Examples

**Good:**
```javascript
describe('userFetching', () => {
  describe('getOrFetchUser', () => {
    it('should return user from database if exists with UID')
    it('should fetch from API if user not in database')
    it('should handle errors gracefully')
  });
});
```

**Bad:**
```javascript
describe('tests', () => {
  it('test 1')
  it('test 2')
});
```

## Common Testing Patterns

### Testing Async Functions

```javascript
it('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBeTruthy();
});
```

### Testing Promises

```javascript
it('should resolve promise', () => {
  return promiseFunction().then(result => {
    expect(result).toBeTruthy();
  });
});
```

### Testing Errors

```javascript
it('should throw error for invalid input', async () => {
  await expect(functionUnderTest(null))
    .rejects
    .toThrow('Invalid input');
});
```

### Testing Callbacks

```javascript
it('should call callback with result', (done) => {
  functionWithCallback((result) => {
    expect(result).toBeTruthy();
    done();
  });
});
```

## Coverage Reports

### Viewing Coverage

After running `npm run test:coverage`:

1. **Terminal Summary**
   ```
   ----------------------|---------|----------|---------|---------|
   File                  | % Stmts | % Branch | % Funcs | % Lines |
   ----------------------|---------|----------|---------|---------|
   All files            |   90.42 |    80.82 |     100 |   90.42 |
    userFetching.js     |   90.42 |    80.82 |     100 |   90.42 |
   ----------------------|---------|----------|---------|---------|
   ```

2. **HTML Report**
   - Open `coverage/lcov-report/index.html`
   - Interactive coverage visualization
   - Line-by-line coverage highlighting

### Improving Coverage

1. **Identify uncovered lines**
   - Check HTML report for red/yellow highlighting

2. **Add tests for uncovered branches**
   ```javascript
   // If you see uncovered branch for null check:
   if (value === null) { /* ... */ }

   // Add test:
   it('should handle null value', () => {
     functionUnderTest(null);
   });
   ```

3. **Test error paths**
   - Mock functions to throw errors
   - Test error handling logic

## Troubleshooting

### Tests Failing Locally

1. **Clear Jest cache**
   ```bash
   jest --clearCache
   npm run test:unit
   ```

2. **Check Node version**
   ```bash
   node --version  # Should be 18+
   ```

3. **Reinstall dependencies**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Tests Passing Locally But Failing in CI

1. **Check environment differences**
   - Node version
   - OS differences (Windows vs Linux)
   - Environment variables

2. **Run tests in same environment**
   ```bash
   docker run -it node:18 /bin/bash
   npm install
   npm test
   ```

### Memory Issues

```bash
# Increase memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run test:unit
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)
- [Vitest](https://vitest.dev/)
- [Cypress](https://docs.cypress.io/)
- [MSW](https://mswjs.io/)

---

**Last Updated:** November 2025
**Coverage Target:** 95% across all metrics
**Status:** Foundation established, expansion in progress
