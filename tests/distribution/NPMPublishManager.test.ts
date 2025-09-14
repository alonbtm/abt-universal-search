/**
 * NPMPublishManager Tests
 * Tests for automated npm publishing with semantic versioning
 */

import { NPMPublishManager } from '../../tools/publishing/NPMPublishManager';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

jest.mock('fs');
jest.mock('child_process');

describe('NPMPublishManager', () => {
  let npmManager: NPMPublishManager;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      packagePath: '/test/project',
      registry: 'https://registry.npmjs.org/',
      access: 'public',
      tag: 'latest',
      dryRun: false
    };

    // Mock package.json
    (existsSync as jest.Mock).mockReturnValue(true);
    (readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
      name: 'test-package',
      version: '1.0.0',
      description: 'Test package',
      main: 'dist/index.js',
      license: 'MIT'
    }));

    npmManager = new NPMPublishManager(mockConfig);
  });

  describe('Version Management', () => {
    it('should generate major version bump correctly', () => {
      const bump = npmManager.generateVersionBump('major');
      
      expect(bump.type).toBe('major');
      expect(bump.current).toBe('1.0.0');
      expect(bump.next).toBe('2.0.0');
      expect(bump.changelog).toBeDefined();
    });

    it('should generate minor version bump correctly', () => {
      const bump = npmManager.generateVersionBump('minor');
      
      expect(bump.type).toBe('minor');
      expect(bump.current).toBe('1.0.0');
      expect(bump.next).toBe('1.1.0');
    });

    it('should generate patch version bump correctly', () => {
      const bump = npmManager.generateVersionBump('patch');
      
      expect(bump.type).toBe('patch');
      expect(bump.current).toBe('1.0.0');
      expect(bump.next).toBe('1.0.1');
    });

    it('should generate prerelease version bump correctly', () => {
      const bump = npmManager.generateVersionBump('prerelease');
      
      expect(bump.type).toBe('prerelease');
      expect(bump.current).toBe('1.0.0');
      expect(bump.next).toBe('1.0.1-beta.0');
    });
  });

  describe('Package Publishing', () => {
    it('should publish package successfully', async () => {
      // Mock successful execSync calls
      (execSync as jest.Mock)
        .mockReturnValueOnce('') // npm test
        .mockReturnValueOnce('') // npm run lint
        .mockReturnValueOnce('') // npm run build
        .mockReturnValueOnce('') // npm view (version check)
        .mockReturnValueOnce('+ test-package@1.0.1') // npm publish
        .mockReturnValueOnce('') // git tag
        .mockReturnValueOnce(''); // git push

      const versionBump = {
        type: 'patch' as const,
        current: '1.0.0',
        next: '1.0.1',
        changelog: ['Bug fixes']
      };

      const result = await npmManager.publish(versionBump);

      expect(result.success).toBe(true);
      expect(result.version).toBe('1.0.1');
      expect(result.packageUrl).toContain('test-package');
    });

    it('should handle publish failures', async () => {
      (execSync as jest.Mock)
        .mockReturnValueOnce('') // npm test
        .mockImplementationOnce(() => {
          throw new Error('npm publish failed');
        });

      const versionBump = {
        type: 'patch' as const,
        current: '1.0.0',
        next: '1.0.1',
        changelog: ['Bug fixes']
      };

      const result = await npmManager.publish(versionBump);

      expect(result.success).toBe(false);
      expect(result.error).toContain('npm publish failed');
    });

    it('should handle dry run mode', async () => {
      const dryRunManager = new NPMPublishManager({
        ...mockConfig,
        dryRun: true
      });

      (execSync as jest.Mock)
        .mockReturnValueOnce('') // npm test
        .mockReturnValueOnce('') // npm view (version check)
        .mockReturnValueOnce('+ test-package@1.0.1 (dry run)'); // npm publish --dry-run

      const versionBump = {
        type: 'patch' as const,
        current: '1.0.0',
        next: '1.0.1',
        changelog: ['Bug fixes']
      };

      const result = await dryRunManager.publish(versionBump);

      expect(result.success).toBe(true);
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('--dry-run'),
        expect.any(Object)
      );
    });
  });

  describe('Package Validation', () => {
    it('should validate required package.json fields', async () => {
      await expect(npmManager.validatePackage()).resolves.not.toThrow();
    });

    it('should reject package with missing required fields', async () => {
      (readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
        name: 'test-package'
        // Missing version, description, main, license
      }));

      const invalidManager = new NPMPublishManager(mockConfig);

      await expect(invalidManager.validatePackage()).rejects.toThrow('Missing required field');
    });

    it('should check for existing version on npm', async () => {
      // Mock npm view to return existing version
      (execSync as jest.Mock).mockReturnValueOnce('1.0.0');

      await expect(npmManager.validatePackage()).rejects.toThrow('Version 1.0.0 already exists');
    });

    it('should validate main file exists', async () => {
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        return !path.includes('dist/index.js'); // Main file doesn't exist
      });

      await expect(npmManager.validatePackage()).rejects.toThrow('Main file not found');
    });
  });

  describe('Pre-publish Checks', () => {
    it('should run all pre-publish checks successfully', async () => {
      (execSync as jest.Mock)
        .mockReturnValueOnce('') // npm test
        .mockReturnValueOnce('') // npm run lint
        .mockReturnValueOnce(''); // npm run build

      await expect(npmManager.runPrePublishChecks()).resolves.not.toThrow();
    });

    it('should fail if tests fail', async () => {
      (execSync as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Tests failed');
      });

      await expect(npmManager.runPrePublishChecks()).rejects.toThrow('Pre-publish checks failed');
    });

    it('should continue if optional scripts fail', async () => {
      (execSync as jest.Mock)
        .mockReturnValueOnce('') // npm test (success)
        .mockImplementationOnce(() => {
          throw new Error('Lint failed');
        }) // npm run lint (fail)
        .mockReturnValueOnce(''); // npm run build (success)

      await expect(npmManager.runPrePublishChecks()).resolves.not.toThrow();
    });
  });

  describe('Changelog Generation', () => {
    it('should generate changelog from git history', async () => {
      (execSync as jest.Mock).mockReturnValue(`
        abc1234 feat: add new feature
        def5678 fix: resolve bug in component
        ghi9012 chore: update dependencies
      `);

      const changelog = await npmManager.generateChangelog('1.0.0', '1.1.0');

      expect(changelog.version).toBe('1.1.0');
      expect(changelog.changes.added).toContain('feat: add new feature');
      expect(changelog.changes.fixed).toContain('fix: resolve bug in component');
      expect(changelog.changes.changed).toContain('chore: update dependencies');
    });

    it('should categorize commits correctly', async () => {
      (execSync as jest.Mock).mockReturnValue(`
        abc1234 add: new API endpoint
        def5678 remove: deprecated method
        ghi9012 security: fix XSS vulnerability
        jkl3456 deprecate: old function
      `);

      const changelog = await npmManager.generateChangelog();

      expect(changelog.changes.added.length).toBe(1);
      expect(changelog.changes.removed.length).toBe(1);
      expect(changelog.changes.security.length).toBe(1);
      expect(changelog.changes.deprecated.length).toBe(1);
    });

    it('should handle empty git history', async () => {
      (execSync as jest.Mock).mockReturnValue('');

      const changelog = await npmManager.generateChangelog();

      expect(changelog.changes.added).toHaveLength(0);
      expect(changelog.changes.changed).toHaveLength(0);
      expect(changelog.changes.fixed).toHaveLength(0);
    });
  });

  describe('Changelog File Management', () => {
    it('should update existing CHANGELOG.md', async () => {
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        return path.includes('CHANGELOG.md');
      });
      (readFileSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('CHANGELOG.md')) {
          return '# Changelog\n\n## [1.0.0] - 2023-01-01\n- Initial release\n';
        }
        return JSON.stringify({ name: 'test-package', version: '1.0.0' });
      });

      const mockWriteFileSync = jest.fn();
      (writeFileSync as jest.Mock).mockImplementation(mockWriteFileSync);

      const entry = {
        version: '1.1.0',
        date: '2023-02-01',
        changes: {
          added: ['New feature'],
          changed: [],
          deprecated: [],
          removed: [],
          fixed: ['Bug fix'],
          security: []
        }
      };

      await npmManager.updateChangelogFile(entry);

      expect(mockWriteFileSync).toHaveBeenCalled();
      const writtenContent = mockWriteFileSync.mock.calls[0][1];
      expect(writtenContent).toContain('## [1.1.0] - 2023-02-01');
      expect(writtenContent).toContain('### Added');
      expect(writtenContent).toContain('- New feature');
    });

    it('should create new CHANGELOG.md if it does not exist', async () => {
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        return !path.includes('CHANGELOG.md');
      });

      const mockWriteFileSync = jest.fn();
      (writeFileSync as jest.Mock).mockImplementation(mockWriteFileSync);

      const entry = {
        version: '1.0.0',
        date: '2023-01-01',
        changes: {
          added: ['Initial release'],
          changed: [],
          deprecated: [],
          removed: [],
          fixed: [],
          security: []
        }
      };

      await npmManager.updateChangelogFile(entry);

      expect(mockWriteFileSync).toHaveBeenCalled();
      const writtenContent = mockWriteFileSync.mock.calls[0][1];
      expect(writtenContent).toContain('# Changelog');
      expect(writtenContent).toContain('## [1.0.0] - 2023-01-01');
    });
  });

  describe('GitHub Release Integration', () => {
    it('should create GitHub release with tag', async () => {
      (execSync as jest.Mock)
        .mockReturnValueOnce(`
          abc1234 feat: add new feature
          def5678 fix: resolve bug
        `) // git log
        .mockReturnValueOnce('') // git tag
        .mockReturnValueOnce(''); // git push

      await npmManager.createGitHubRelease('1.1.0');

      expect(execSync).toHaveBeenCalledWith(
        'git tag -a v1.1.0 -m "Release v1.1.0"',
        expect.any(Object)
      );
      expect(execSync).toHaveBeenCalledWith(
        'git push origin v1.1.0',
        expect.any(Object)
      );
    });

    it('should handle git command failures gracefully', async () => {
      (execSync as jest.Mock).mockImplementation(() => {
        throw new Error('Git command failed');
      });

      // Should not throw, just warn
      await expect(npmManager.createGitHubRelease('1.1.0')).resolves.not.toThrow();
    });
  });

  describe('Download Statistics', () => {
    it('should fetch download statistics', async () => {
      const stats = await npmManager.getDownloadStats('last-week');

      expect(stats).toHaveProperty('downloads');
      expect(stats).toHaveProperty('period');
      expect(stats).toHaveProperty('package');
      expect(stats.period).toBe('last-week');
    });

    it('should handle different time periods', async () => {
      const dayStats = await npmManager.getDownloadStats('last-day');
      const monthStats = await npmManager.getDownloadStats('last-month');

      expect(dayStats.period).toBe('last-day');
      expect(monthStats.period).toBe('last-month');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing package.json', () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      expect(() => new NPMPublishManager(mockConfig)).toThrow('package.json not found');
    });

    it('should handle invalid package.json', () => {
      (readFileSync as jest.Mock).mockReturnValue('invalid json');

      expect(() => new NPMPublishManager(mockConfig)).toThrow();
    });

    it('should handle network timeouts', async () => {
      (execSync as jest.Mock).mockImplementation(() => {
        const error = new Error('Command timeout');
        (error as any).code = 'ETIMEDOUT';
        throw error;
      });

      const result = await npmManager.publish();

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  describe('Configuration Options', () => {
    it('should use custom registry', async () => {
      const customManager = new NPMPublishManager({
        ...mockConfig,
        registry: 'https://custom-registry.com/'
      });

      (execSync as jest.Mock).mockReturnValue('+ test-package@1.0.1');

      await customManager.publish();

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('--registry https://custom-registry.com/'),
        expect.any(Object)
      );
    });

    it('should use custom access level', async () => {
      const restrictedManager = new NPMPublishManager({
        ...mockConfig,
        access: 'restricted'
      });

      (execSync as jest.Mock).mockReturnValue('+ test-package@1.0.1');

      await restrictedManager.publish();

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('--access restricted'),
        expect.any(Object)
      );
    });

    it('should use custom tag', async () => {
      const betaManager = new NPMPublishManager({
        ...mockConfig,
        tag: 'beta'
      });

      (execSync as jest.Mock).mockReturnValue('+ test-package@1.0.1');

      await betaManager.publish();

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('--tag beta'),
        expect.any(Object)
      );
    });
  });
});
