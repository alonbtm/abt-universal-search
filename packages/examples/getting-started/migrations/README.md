# Migration Guide - Universal Search Progressive Complexity

> Step-by-step guides for upgrading between complexity levels

## 📈 Migration Path Overview

```
Level 1: 30-Second Start (CDN)
    ↓ Migration Guide A
Level 2: 5-Minute Setup (npm)
    ↓ Migration Guide B  
Level 3: 30-Minute Integration (Full Dev)
    ↓ Migration Guide C
Level 4: Production Deployment (Enterprise)
```

## 🗺️ Available Migration Guides

| From | To | Guide | Estimated Time | Complexity |
|------|----|----|----------------|------------|
| Level 1 | Level 2 | [CDN → npm Setup](./level1-to-level2.md) | 10 minutes | Easy |
| Level 2 | Level 3 | [Basic → Full Integration](./level2-to-level3.md) | 30 minutes | Medium |
| Level 3 | Level 4 | [Dev → Production](./level3-to-level4.md) | 2-4 hours | Advanced |
| Level 1 | Level 3 | [CDN → Full Integration](./level1-to-level3.md) | 45 minutes | Medium |
| Level 1 | Level 4 | [CDN → Production](./level1-to-level4.md) | 4-6 hours | Expert |
| Level 2 | Level 4 | [npm → Production](./level2-to-level4.md) | 2-3 hours | Advanced |

## 🔄 Quick Migration Commands

### Level 1 → Level 2
```bash
# Create project structure
npm init -y
npm install @universal-search/core
# Follow detailed guide: level1-to-level2.md
```

### Level 2 → Level 3
```bash
# Add development dependencies
npm install -D typescript jest @types/jest
# Follow detailed guide: level2-to-level3.md
```

### Level 3 → Level 4
```bash
# Add production dependencies
npm install helmet express cors winston
# Follow detailed guide: level3-to-level4.md
```

## 🛠️ Migration Tools

### Configuration Converter
```bash
# Convert CDN configuration to npm format
npx @universal-search/migrate cdn-to-npm config.js

# Convert basic to advanced configuration
npx @universal-search/migrate basic-to-advanced config.js
```

### Compatibility Checker
```bash
# Check compatibility before migration
npx @universal-search/migrate check --from=level1 --to=level2
```

## 📋 Pre-Migration Checklist

- [ ] Backup current implementation
- [ ] Review breaking changes
- [ ] Test in development environment
- [ ] Plan rollback strategy
- [ ] Update documentation
- [ ] Train team members
- [ ] Schedule deployment window

## 🔧 Common Migration Issues

### Breaking Changes
- **v1 → v2**: Configuration format changed
- **Basic → Advanced**: Event handling structure updated
- **Dev → Production**: Security requirements added

### Compatibility Matrix
| Feature | Level 1 | Level 2 | Level 3 | Level 4 |
|---------|---------|---------|---------|---------|
| CDN Support | ✅ | ❌ | ❌ | ❌ |
| TypeScript | ❌ | ✅ | ✅ | ✅ |
| Testing | ❌ | Basic | Full | Enterprise |
| Security | Basic | Medium | High | Enterprise |
| Monitoring | ❌ | ❌ | Basic | Full |

## 📞 Support

Need help with migration?
- 📖 [Documentation](../docs/)
- 💬 [Community Forum](https://github.com/universal-search/discussions)
- 🐛 [Issue Tracker](https://github.com/universal-search/issues)
- 📧 [Enterprise Support](mailto:enterprise@universal-search.dev)