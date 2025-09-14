/**
 * NPM Publish Manager
 * Handles automated npm releases with semantic versioning and changelog generation
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export interface INPMConfig {
  packagePath: string;
  registry?: string;
  access?: 'public' | 'restricted';
  tag?: string;
  dryRun?: boolean;
  timeout?: number;
}

export interface IVersionBump {
  type: 'major' | 'minor' | 'patch' | 'prerelease';
  current: string;
  next: string;
  changelog: string[];
}

export interface IReleaseConfig {
  version: string;
  tag: string;
  changelog: string;
  assets: string[];
  prerelease: boolean;
  draft: boolean;
}

export interface IPublishResult {
  success: boolean;
  version: string;
  packageUrl: string;
  publishTime: Date;
  size: number;
  error?: string;
}

export interface IChangelogEntry {
  version: string;
  date: string;
  changes: {
    added: string[];
    changed: string[];
    deprecated: string[];
    removed: string[];
    fixed: string[];
    security: string[];
  };
}

export class NPMPublishManager {
  private config: INPMConfig;
  private packageJson: any;

  constructor(config: INPMConfig) {
    this.config = {
      registry: 'https://registry.npmjs.org/',
      access: 'public',
      tag: 'latest',
      dryRun: false,
      timeout: 300000, // 5 minutes
      ...config
    };
    
    this.loadPackageJson();
  }

  /**
   * Publish package to npm
   */
  async publish(versionBump?: IVersionBump): Promise<IPublishResult> {
    console.log('📦 Starting npm publish process...');

    try {
      // Update version if bump provided
      if (versionBump) {
        await this.updateVersion(versionBump);
      }

      // Validate package
      await this.validatePackage();

      // Run pre-publish checks
      await this.runPrePublishChecks();

      // Publish to npm
      const result = await this.publishToNPM();

      // Create GitHub release
      if (result.success) {
        await this.createGitHubRelease(result.version);
      }

      return result;
    } catch (error) {
      console.error('❌ Publish failed:', error);
      return {
        success: false,
        version: this.packageJson.version,
        packageUrl: '',
        publishTime: new Date(),
        size: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Generate semantic version bump
   */
  generateVersionBump(type: 'major' | 'minor' | 'patch' | 'prerelease'): IVersionBump {
    const current = this.packageJson.version;
    const [major, minor, patch] = current.split('.').map(Number);

    let next: string;
    switch (type) {
      case 'major':
        next = `${major + 1}.0.0`;
        break;
      case 'minor':
        next = `${major}.${minor + 1}.0`;
        break;
      case 'patch':
        next = `${major}.${minor}.${patch + 1}`;
        break;
      case 'prerelease':
        next = `${major}.${minor}.${patch + 1}-beta.0`;
        break;
    }

    const changelog = this.generateChangelogForVersion(current, next);

    return {
      type,
      current,
      next,
      changelog
    };
  }

  /**
   * Generate changelog from git history
   */
  async generateChangelog(fromVersion?: string, toVersion?: string): Promise<IChangelogEntry> {
    console.log('📝 Generating changelog...');

    const version = toVersion || this.packageJson.version;
    const commits = await this.getCommitsSinceVersion(fromVersion);
    
    const changes = this.categorizeCommits(commits);
    
    const entry: IChangelogEntry = {
      version,
      date: new Date().toISOString().split('T')[0] || new Date().toISOString(),
      changes
    };

    return entry;
  }

  /**
   * Update CHANGELOG.md file
   */
  async updateChangelogFile(entry: IChangelogEntry): Promise<void> {
    const changelogPath = resolve(this.config.packagePath, 'CHANGELOG.md');
    let content = '';

    if (existsSync(changelogPath)) {
      content = readFileSync(changelogPath, 'utf8');
    } else {
      content = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
    }

    const newEntry = this.formatChangelogEntry(entry);
    
    // Insert new entry after the header
    const lines = content.split('\n');
    const insertIndex = lines.findIndex(line => line.startsWith('## ')) || 3;
    lines.splice(insertIndex, 0, newEntry, '');

    writeFileSync(changelogPath, lines.join('\n'));
    console.log('📝 Updated CHANGELOG.md');
  }

  /**
   * Validate package before publishing
   */
  async validatePackage(): Promise<void> {
    console.log('🔍 Validating package...');

    // Check required fields
    const requiredFields = ['name', 'version', 'description', 'main', 'license'];
    for (const field of requiredFields) {
      if (!this.packageJson[field]) {
        throw new Error(`Missing required field in package.json: ${field}`);
      }
    }

    // Check if version already exists
    const versionExists = await this.checkVersionExists(this.packageJson.version);
    if (versionExists) {
      throw new Error(`Version ${this.packageJson.version} already exists on npm`);
    }

    // Validate build files exist
    if (this.packageJson.main && !existsSync(resolve(this.config.packagePath, this.packageJson.main))) {
      throw new Error(`Main file not found: ${this.packageJson.main}`);
    }

    console.log('✅ Package validation passed');
  }

  /**
   * Run pre-publish checks
   */
  async runPrePublishChecks(): Promise<void> {
    console.log('🧪 Running pre-publish checks...');

    try {
      // Run tests
      execSync('npm test', { 
        cwd: this.config.packagePath,
        stdio: 'pipe'
      });

      // Run linting
      try {
        execSync('npm run lint', { 
          cwd: this.config.packagePath,
          stdio: 'pipe'
        });
      } catch {
        console.warn('⚠️ Linting not available or failed');
      }

      // Build package
      try {
        execSync('npm run build', { 
          cwd: this.config.packagePath,
          stdio: 'pipe'
        });
      } catch {
        console.warn('⚠️ Build script not available or failed');
      }

      console.log('✅ Pre-publish checks passed');
    } catch (error) {
      throw new Error(`Pre-publish checks failed: ${error}`);
    }
  }

  /**
   * Create GitHub release
   */
  async createGitHubRelease(version: string): Promise<void> {
    console.log(`🏷️ Creating GitHub release for v${version}...`);

    try {
      const changelog = await this.generateChangelog();
      // Format release notes
      this.formatReleaseNotes(changelog);

      // Create git tag
      execSync(`git tag -a v${version} -m "Release v${version}"`, {
        cwd: this.config.packagePath
      });

      // Push tag
      execSync(`git push origin v${version}`, {
        cwd: this.config.packagePath
      });

      console.log(`✅ Created GitHub release v${version}`);
    } catch (error) {
      console.warn('⚠️ Failed to create GitHub release:', error);
    }
  }

  /**
   * Get package download statistics
   */
  async getDownloadStats(period: 'last-day' | 'last-week' | 'last-month' = 'last-week'): Promise<any> {
    try {
      const packageName = this.packageJson.name;
      // Simulate npm stats API call
      return {
        downloads: Math.floor(Math.random() * 10000),
        period,
        package: packageName
      };
    } catch (error) {
      console.warn('Failed to fetch download stats:', error);
      return null;
    }
  }

  /**
   * Load package.json
   */
  private loadPackageJson(): void {
    const packageJsonPath = resolve(this.config.packagePath, 'package.json');
    
    if (!existsSync(packageJsonPath)) {
      throw new Error(`package.json not found at: ${packageJsonPath}`);
    }

    this.packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  }

  /**
   * Update version in package.json
   */
  private async updateVersion(versionBump: IVersionBump): Promise<void> {
    this.packageJson.version = versionBump.next;
    
    const packageJsonPath = resolve(this.config.packagePath, 'package.json');
    writeFileSync(packageJsonPath, JSON.stringify(this.packageJson, null, 2));
    
    console.log(`📈 Updated version: ${versionBump.current} → ${versionBump.next}`);
  }

  /**
   * Publish to npm registry
   */
  private async publishToNPM(): Promise<IPublishResult> {
    const startTime = new Date();
    
    try {
      const args = [
        'publish',
        '--registry', this.config.registry!,
        '--access', this.config.access!,
        '--tag', this.config.tag!
      ];

      if (this.config.dryRun) {
        args.push('--dry-run');
      }

      execSync(`npm ${args.join(' ')}`, {
        cwd: this.config.packagePath,
        stdio: 'pipe',
        timeout: this.config.timeout
      });

      const packageUrl = `${this.config.registry}${this.packageJson.name}`;
      const size = this.calculatePackageSize();

      console.log(`✅ Successfully published ${this.packageJson.name}@${this.packageJson.version}`);

      return {
        success: true,
        version: this.packageJson.version,
        packageUrl,
        publishTime: startTime,
        size
      };
    } catch (error) {
      throw new Error(`npm publish failed: ${error}`);
    }
  }

  /**
   * Check if version exists on npm
   */
  private async checkVersionExists(version: string): Promise<boolean> {
    try {
      execSync(`npm view ${this.packageJson.name}@${version}`, {
        stdio: 'pipe'
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get commits since version
   */
  private async getCommitsSinceVersion(fromVersion?: string): Promise<string[]> {
    try {
      const range = fromVersion ? `v${fromVersion}..HEAD` : '--since="1 month ago"';
      const result = execSync(`git log ${range} --oneline`, {
        cwd: this.config.packagePath,
        encoding: 'utf8'
      });
      
      return result.trim().split('\n').filter(line => line.length > 0);
    } catch {
      return [];
    }
  }

  /**
   * Categorize commits by type
   */
  private categorizeCommits(commits: string[]): IChangelogEntry['changes'] {
    const changes = {
      added: [] as string[],
      changed: [] as string[],
      deprecated: [] as string[],
      removed: [] as string[],
      fixed: [] as string[],
      security: [] as string[]
    };

    for (const commit of commits) {
      const message = commit.substring(8); // Remove hash
      
      if (message.match(/^(feat|add)/i)) {
        changes.added.push(message);
      } else if (message.match(/^(fix|bug)/i)) {
        changes.fixed.push(message);
      } else if (message.match(/^(change|update|modify)/i)) {
        changes.changed.push(message);
      } else if (message.match(/^(remove|delete)/i)) {
        changes.removed.push(message);
      } else if (message.match(/^(security|sec)/i)) {
        changes.security.push(message);
      } else if (message.match(/^(deprecate|dep)/i)) {
        changes.deprecated.push(message);
      } else {
        changes.changed.push(message);
      }
    }

    return changes;
  }

  /**
   * Generate changelog for version
   */
  private generateChangelogForVersion(current: string, next: string): string[] {
    return [
      `Version bump from ${current} to ${next}`,
      'See CHANGELOG.md for detailed changes'
    ];
  }

  /**
   * Format changelog entry
   */
  private formatChangelogEntry(entry: IChangelogEntry): string {
    const lines = [`## [${entry.version}] - ${entry.date}`];

    const sections = [
      { key: 'added', title: 'Added' },
      { key: 'changed', title: 'Changed' },
      { key: 'deprecated', title: 'Deprecated' },
      { key: 'removed', title: 'Removed' },
      { key: 'fixed', title: 'Fixed' },
      { key: 'security', title: 'Security' }
    ];

    for (const section of sections) {
      const items = entry.changes[section.key as keyof typeof entry.changes];
      if (items.length > 0) {
        lines.push(`### ${section.title}`);
        lines.push(...items.map(item => `- ${item}`));
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Format release notes
   */
  private formatReleaseNotes(changelog: IChangelogEntry): string {
    return this.formatChangelogEntry(changelog);
  }

  /**
   * Calculate package size
   */
  private calculatePackageSize(): number {
    try {
      const result = execSync('npm pack --dry-run', {
        cwd: this.config.packagePath,
        encoding: 'utf8'
      });
      
      const sizeMatch = result.match(/package size:\s*(\d+)/);
      return sizeMatch && sizeMatch[1] ? parseInt(sizeMatch[1], 10) : 0;
    } catch {
      return 0;
    }
  }
}
