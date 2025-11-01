/**
 * Unit Tests for User Fetching Utilities
 * Tests smart auto-fetch UID caching strategy
 */

const {
    buildProfileUrl,
    getOrFetchUser,
    bulkFetchUsers,
    userHasUid,
    getUserByUid
} = require('../../../src/utils/userFetching');

// Mock dependencies
jest.mock('../../../database/db-v2');
jest.mock('../../../src/utils/platformIdUtils');

const { getDatabase } = require('../../../database/db-v2');
const {
    detectPlatform,
    extractUsernameFromUrl,
    fetchPlatformId
} = require('../../../src/utils/platformIdUtils');

describe('userFetching', () => {
    let mockDb;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Setup mock database
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

        getDatabase.mockReturnValue(mockDb);

        // Setup default mock implementations
        detectPlatform.mockImplementation((url) => {
            if (url.includes('facebook.com')) return 'facebook';
            if (url.includes('instagram.com')) return 'instagram';
            return null;
        });

        extractUsernameFromUrl.mockImplementation((url) => {
            if (url.includes('facebook.com')) {
                const match = url.match(/facebook\.com\/([^/?]+)/);
                return match ? match[1] : null;
            }
            if (url.includes('instagram.com')) {
                const match = url.match(/instagram\.com\/([^/?]+)/);
                return match ? match[1] : null;
            }
            return null;
        });
    });

    describe('buildProfileUrl', () => {
        it('should build Facebook profile URL', () => {
            const url = buildProfileUrl('testuser', 'facebook');
            expect(url).toBe('https://www.facebook.com/testuser');
        });

        it('should build Instagram profile URL', () => {
            const url = buildProfileUrl('testuser', 'instagram');
            expect(url).toBe('https://www.instagram.com/testuser/');
        });

        it('should throw error for unknown platform', () => {
            expect(() => buildProfileUrl('testuser', 'twitter'))
                .toThrow('Unknown platform: twitter');
        });
    });

    describe('getOrFetchUser', () => {
        it('should return user from database if exists with UID (fast path)', async () => {
            mockDb.db = null; // Ensure connection is required

            const mockUser = {
                id: 1,
                uid: '123456789',
                username: 'testuser',
                platform_name: 'instagram'
            };

            mockDb.getUserByUsername.mockResolvedValue(mockUser);

            const result = await getOrFetchUser('https://www.instagram.com/testuser/', null, 'client_123');

            expect(result).toEqual(mockUser);
            expect(mockDb.getUserByUsername).toHaveBeenCalledWith('testuser');
            expect(fetchPlatformId).not.toHaveBeenCalled();
            expect(mockDb.connect).toHaveBeenCalled();
            expect(mockDb.close).toHaveBeenCalled();
        });

        it('should fetch from API if user not in database (slow path)', async () => {
            mockDb.getUserByUsername.mockResolvedValue(null);

            const mockApiResponse = {
                uid: '987654321',
                username: 'testuser',
                name: 'Test User',
                avatar: 'https://example.com/avatar.jpg'
            };

            fetchPlatformId.mockResolvedValue(mockApiResponse);

            const mockCreatedUser = {
                id: 2,
                uid: '987654321',
                username: 'testuser',
                platform_name: 'instagram'
            };

            mockDb.getOrCreateUser.mockResolvedValue(mockCreatedUser);

            const result = await getOrFetchUser('https://www.instagram.com/testuser/', null, 'client_123');

            expect(result).toEqual(mockCreatedUser);
            expect(mockDb.getUserByUsername).toHaveBeenCalledWith('testuser');
            expect(fetchPlatformId).toHaveBeenCalledWith('instagram', 'https://www.instagram.com/testuser/', 'client_123');
            expect(mockDb.getOrCreateUser).toHaveBeenCalledWith({
                platform: 'instagram',
                uid: '987654321',
                username: 'testuser',
                profile_url: 'https://www.instagram.com/testuser/'
            });
        });

        it('should update existing user if found without UID', async () => {
            const mockExistingUser = {
                id: 3,
                uid: null,
                username: 'testuser',
                platform_name: 'facebook'
            };

            mockDb.getUserByUsername.mockResolvedValue(mockExistingUser);

            const mockApiResponse = {
                uid: '111222333',
                username: 'testuser',
                name: 'Test User'
            };

            fetchPlatformId.mockResolvedValue(mockApiResponse);

            const mockUpdatedUser = {
                id: 3,
                uid: '111222333',
                username: 'testuser',
                platform_name: 'facebook'
            };

            mockDb.getUserByUid.mockResolvedValue(mockUpdatedUser);

            mockDb.db.run = jest.fn((sql, params, callback) => {
                if (callback) callback.call({ lastID: 3 });
            });

            const result = await getOrFetchUser('https://www.facebook.com/testuser', null, 'client_123');

            expect(result).toEqual(mockUpdatedUser);
            expect(fetchPlatformId).toHaveBeenCalledWith('facebook', 'https://www.facebook.com/testuser', 'client_123');
        });

        it('should handle username input with platform specified', async () => {
            const mockUser = {
                id: 4,
                uid: '555666777',
                username: 'testuser',
                platform_name: 'instagram'
            };

            mockDb.getUserByUsername.mockResolvedValue(mockUser);

            const result = await getOrFetchUser('testuser', 'instagram', 'client_123');

            expect(result).toEqual(mockUser);
            expect(mockDb.getUserByUsername).toHaveBeenCalledWith('testuser');
        });

        it('should throw error if username provided without platform', async () => {
            await expect(getOrFetchUser('testuser', null, 'client_123'))
                .rejects
                .toThrow('Platform must be specified when providing username instead of URL');
        });

        it('should return null if username cannot be extracted', async () => {
            extractUsernameFromUrl.mockReturnValue(null);

            const result = await getOrFetchUser('https://invalid-url.com', null, 'client_123');

            expect(result).toBeNull();
        });

        it('should return null if platform cannot be detected', async () => {
            detectPlatform.mockReturnValue(null);

            const result = await getOrFetchUser('https://twitter.com/testuser', null, 'client_123');

            expect(result).toBeNull();
        });

        it('should create user without UID if API fetch fails', async () => {
            mockDb.getUserByUsername.mockResolvedValue(null);
            fetchPlatformId.mockResolvedValue(null);

            const mockCreatedUser = {
                id: 5,
                uid: null,
                username: 'testuser',
                platform_name: 'instagram'
            };

            mockDb.getOrCreateUser.mockResolvedValue(mockCreatedUser);

            const result = await getOrFetchUser('https://www.instagram.com/testuser/', null, 'client_123');

            expect(result).toEqual(mockCreatedUser);
            expect(mockDb.getOrCreateUser).toHaveBeenCalledWith({
                platform: 'instagram',
                uid: null,
                username: 'testuser',
                profile_url: 'https://www.instagram.com/testuser/'
            });
        });

        it('should update username if API returns different username', async () => {
            const mockExistingUser = {
                id: 6,
                uid: null,
                username: 'oldusername',
                platform_name: 'instagram'
            };

            mockDb.getUserByUsername.mockResolvedValue(mockExistingUser);

            const mockApiResponse = {
                uid: '999888777',
                username: 'newusername',
                name: 'Test User'
            };

            fetchPlatformId.mockResolvedValue(mockApiResponse);

            const mockUpdatedUser = {
                id: 6,
                uid: '999888777',
                username: 'newusername',
                platform_name: 'instagram'
            };

            mockDb.getUserByUid.mockResolvedValue(mockUpdatedUser);
            mockDb.db.run = jest.fn((sql, params, callback) => {
                if (callback) callback.call({ lastID: 6 });
            });

            await getOrFetchUser('https://www.instagram.com/oldusername/', null, 'client_123');

            expect(mockDb.updateUsername).toHaveBeenCalledWith(6, 'newusername', 'https://www.instagram.com/oldusername/');
        });

        it('should not close database if already connected', async () => {
            mockDb.db = { some: 'connection' };

            const mockUser = {
                id: 1,
                uid: '123456789',
                username: 'testuser',
                platform_name: 'instagram'
            };

            mockDb.getUserByUsername.mockResolvedValue(mockUser);

            await getOrFetchUser('https://www.instagram.com/testuser/', null, 'client_123');

            expect(mockDb.connect).not.toHaveBeenCalled();
            expect(mockDb.close).not.toHaveBeenCalled();
        });
    });

    describe('bulkFetchUsers', () => {
        it('should fetch multiple users in parallel', async () => {
            const urls = [
                'https://www.instagram.com/user1/',
                'https://www.facebook.com/user2',
                'https://www.instagram.com/user3/'
            ];

            const mockUsers = [
                { id: 1, uid: '111', username: 'user1', platform_name: 'instagram' },
                { id: 2, uid: '222', username: 'user2', platform_name: 'facebook' },
                { id: 3, uid: '333', username: 'user3', platform_name: 'instagram' }
            ];

            mockDb.getUserByUsername
                .mockResolvedValueOnce(mockUsers[0])
                .mockResolvedValueOnce(mockUsers[1])
                .mockResolvedValueOnce(mockUsers[2]);

            const results = await bulkFetchUsers(urls, 'client_123', 3);

            expect(results).toHaveLength(3);
            expect(results[0]).toEqual({ url: urls[0], user: mockUsers[0], error: null });
            expect(results[1]).toEqual({ url: urls[1], user: mockUsers[1], error: null });
            expect(results[2]).toEqual({ url: urls[2], user: mockUsers[2], error: null });
        });

        it('should handle errors in bulk fetch', async () => {
            const urls = [
                'https://www.instagram.com/user1/',
                'https://invalid-url.com/user2'
            ];

            const mockUser = { id: 1, uid: '111', username: 'user1', platform_name: 'instagram' };

            mockDb.db = null;
            mockDb.getUserByUsername.mockResolvedValueOnce(mockUser);
            detectPlatform.mockImplementation((url) => {
                if (url.includes('invalid-url')) return null;
                if (url.includes('instagram.com')) return 'instagram';
                return null;
            });

            const results = await bulkFetchUsers(urls, 'client_123', 2);

            expect(results).toHaveLength(2);

            // Find results by URL since order may vary
            const user1Result = results.find(r => r.url === urls[0]);
            const user2Result = results.find(r => r.url === urls[1]);

            expect(user1Result).toEqual({ url: urls[0], user: mockUser, error: null });
            // When platform cannot be detected, user is null (not an error throw)
            expect(user2Result.user).toBeNull();
        });

        it('should respect concurrency limit', async () => {
            const urls = [
                'https://www.instagram.com/user1/',
                'https://www.instagram.com/user2/',
                'https://www.instagram.com/user3/',
                'https://www.instagram.com/user4/'
            ];

            let concurrentCalls = 0;
            let maxConcurrent = 0;

            mockDb.getUserByUsername.mockImplementation(async () => {
                concurrentCalls++;
                maxConcurrent = Math.max(maxConcurrent, concurrentCalls);
                await new Promise(resolve => setTimeout(resolve, 10));
                concurrentCalls--;
                return { id: 1, uid: '111', username: 'user', platform_name: 'instagram' };
            });

            await bulkFetchUsers(urls, 'client_123', 2);

            expect(maxConcurrent).toBeLessThanOrEqual(2);
        });
    });

    describe('userHasUid', () => {
        it('should return true if user has UID', async () => {
            mockDb.getUserByUsername.mockResolvedValue({
                id: 1,
                uid: '123456789',
                username: 'testuser'
            });

            const result = await userHasUid('testuser');

            expect(result).toBe(true);
            expect(mockDb.getUserByUsername).toHaveBeenCalledWith('testuser');
        });

        it('should return false if user has no UID', async () => {
            mockDb.getUserByUsername.mockResolvedValue({
                id: 1,
                uid: null,
                username: 'testuser'
            });

            const result = await userHasUid('testuser');

            expect(result).toBe(false);
        });

        it('should return false if user not found', async () => {
            mockDb.getUserByUsername.mockResolvedValue(null);

            const result = await userHasUid('testuser');

            expect(result).toBe(false);
        });

        it('should close database after check', async () => {
            mockDb.db = null;
            mockDb.getUserByUsername.mockResolvedValue({ uid: '123' });

            await userHasUid('testuser');

            expect(mockDb.connect).toHaveBeenCalled();
            expect(mockDb.close).toHaveBeenCalled();
        });
    });

    describe('getUserByUid', () => {
        it('should get user by UID', async () => {
            const mockUser = {
                id: 1,
                uid: '123456789',
                username: 'testuser',
                platform_name: 'facebook'
            };

            mockDb.getUserByUid.mockResolvedValue(mockUser);

            const result = await getUserByUid('facebook', '123456789');

            expect(result).toEqual(mockUser);
            expect(mockDb.getUserByUid).toHaveBeenCalledWith('facebook', '123456789');
        });

        it('should return null if user not found', async () => {
            mockDb.getUserByUid.mockResolvedValue(null);

            const result = await getUserByUid('instagram', '999999999');

            expect(result).toBeNull();
        });

        it('should close database after fetch', async () => {
            mockDb.db = null;
            mockDb.getUserByUid.mockResolvedValue({ uid: '123' });

            await getUserByUid('facebook', '123456789');

            expect(mockDb.connect).toHaveBeenCalled();
            expect(mockDb.close).toHaveBeenCalled();
        });
    });
});
