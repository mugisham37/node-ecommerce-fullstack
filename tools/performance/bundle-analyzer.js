/**
 * Bundle Analyzer Tool
 * Analyzes webpack bundles for optimization opportunities
 */

const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const webpack = require('webpack');
const path = require('path');
const fs = require('fs');

class BundleAnalyzer {
  constructor() {
    this.apps = ['web', 'admin'];
    this.reports = {};
  }

  // Analyze bundle for a specific app
  async analyzeApp(appName) {
    console.log(`\n🔍 Analyzing ${appName} bundle...`);
    
    const appPath = path.join(process.cwd(), 'apps', appName);
    const webpackConfigPath = path.join(appPath, 'webpack.config.js');
    const nextConfigPath = path.join(appPath, 'next.config.js');
    
    let config;
    
    // Check if it's a Next.js app
    if (fs.existsSync(nextConfigPath)) {
      config = await this.getNextJsConfig(appPath);
    } else if (fs.existsSync(webpackConfigPath)) {
      config = require(webpackConfigPath);
    } else {
      console.warn(`⚠️  No webpack config found for ${appName}`);
      return null;
    }
    
    // Add bundle analyzer plugin
    config.plugins = config.plugins || [];
    config.plugins.push(
      new BundleAnalyzerPlugin({
        analyzerMode: 'json',
        reportFilename: path.join(process.cwd(), `bundle-report-${appName}.json`),
        openAnalyzer: false,
        generateStatsFile: true,
        statsFilename: path.join(process.cwd(), `bundle-stats-${appName}.json`)
      })
    );
    
    return new Promise((resolve, reject) => {
      webpack(config, (err, stats) => {
        if (err || stats.hasErrors()) {
          console.error(`❌ Bundle analysis failed for ${appName}:`, err || stats.toJson().errors);
          reject(err || new Error('Bundle analysis failed'));
          return;
        }
        
        console.log(`✅ Bundle analysis completed for ${appName}`);
        this.reports[appName] = stats.toJson();
        resolve(stats);
      });
    });
  }

  // Get Next.js webpack config
  async getNextJsConfig(appPath) {
    const nextConfig = require(path.join(appPath, 'next.config.js'));
    
    // Basic webpack config for Next.js analysis
    return {
      mode: 'production',
      entry: path.join(appPath, 'src/pages/_app.tsx'),
      output: {
        path: path.join(appPath, '.next'),
        filename: '[name].[contenthash].js'
      },
      resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
        alias: {
          '@': path.join(appPath, 'src')
        }
      },
      module: {
        rules: [
          {
            test: /\.(ts|tsx)$/,
            use: 'ts-loader',
            exclude: /node_modules/
          },
          {
            test: /\.css$/,
            use: ['style-loader', 'css-loader', 'postcss-loader']
          }
        ]
      },
      plugins: [],
      optimization: {
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all'
            }
          }
        }
      }
    };
  }

  // Analyze all bundles
  async analyzeAll() {
    console.log('🚀 Starting bundle analysis for all apps...');
    
    for (const app of this.apps) {
      try {
        await this.analyzeApp(app);
      } catch (error) {
        console.error(`Failed to analyze ${app}:`, error.message);
      }
    }
    
    this.generateOptimizationReport();
  }

  // Generate optimization recommendations
  generateOptimizationReport() {
    console.log('\n📊 Generating optimization report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      apps: {},
      recommendations: []
    };
    
    for (const [appName, stats] of Object.entries(this.reports)) {
      const analysis = this.analyzeStats(stats);
      report.apps[appName] = analysis;
      
      // Generate recommendations for this app
      const recommendations = this.generateRecommendations(appName, analysis);
      report.recommendations.push(...recommendations);
    }
    
    // Save report
    const reportPath = `bundle-optimization-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate human-readable report
    this.generateHumanReadableReport(report);
    
    console.log(`✅ Optimization report saved to ${reportPath}`);
  }

  // Analyze webpack stats
  analyzeStats(stats) {
    const assets = stats.assets || [];
    const chunks = stats.chunks || [];
    const modules = stats.modules || [];
    
    // Calculate total bundle size
    const totalSize = assets.reduce((sum, asset) => sum + asset.size, 0);
    
    // Find largest assets
    const largestAssets = assets
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);
    
    // Find largest modules
    const largestModules = modules
      .filter(module => module.size > 0)
      .sort((a, b) => b.size - a.size)
      .slice(0, 20);
    
    // Analyze chunk sizes
    const chunkAnalysis = chunks.map(chunk => ({
      id: chunk.id,
      names: chunk.names,
      size: chunk.size,
      modules: chunk.modules?.length || 0
    }));
    
    // Find duplicate modules
    const moduleNames = modules.map(m => m.name || m.identifier);
    const duplicates = moduleNames.filter((name, index) => 
      moduleNames.indexOf(name) !== index
    );
    
    return {
      totalSize,
      totalSizeFormatted: this.formatBytes(totalSize),
      assetCount: assets.length,
      moduleCount: modules.length,
      chunkCount: chunks.length,
      largestAssets: largestAssets.map(asset => ({
        name: asset.name,
        size: asset.size,
        sizeFormatted: this.formatBytes(asset.size)
      })),
      largestModules: largestModules.map(module => ({
        name: module.name || module.identifier,
        size: module.size,
        sizeFormatted: this.formatBytes(module.size)
      })),
      chunks: chunkAnalysis,
      duplicateModules: [...new Set(duplicates)]
    };
  }

  // Generate optimization recommendations
  generateRecommendations(appName, analysis) {
    const recommendations = [];
    
    // Large bundle size
    if (analysis.totalSize > 1024 * 1024) { // > 1MB
      recommendations.push({
        app: appName,
        type: 'bundle-size',
        severity: 'high',
        message: `Bundle size is ${analysis.totalSizeFormatted}. Consider code splitting and lazy loading.`,
        suggestions: [
          'Implement dynamic imports for route-based code splitting',
          'Use React.lazy() for component-level code splitting',
          'Analyze and remove unused dependencies',
          'Enable tree shaking in webpack configuration'
        ]
      });
    }
    
    // Large individual assets
    const largeAssets = analysis.largestAssets.filter(asset => asset.size > 500 * 1024);
    if (largeAssets.length > 0) {
      recommendations.push({
        app: appName,
        type: 'large-assets',
        severity: 'medium',
        message: `Found ${largeAssets.length} large assets (>500KB)`,
        assets: largeAssets.map(asset => asset.name),
        suggestions: [
          'Compress images and use modern formats (WebP, AVIF)',
          'Split large JavaScript files',
          'Use CDN for large static assets',
          'Implement progressive loading for images'
        ]
      });
    }
    
    // Duplicate modules
    if (analysis.duplicateModules.length > 0) {
      recommendations.push({
        app: appName,
        type: 'duplicate-modules',
        severity: 'medium',
        message: `Found ${analysis.duplicateModules.length} duplicate modules`,
        modules: analysis.duplicateModules.slice(0, 10),
        suggestions: [
          'Configure webpack splitChunks to extract common modules',
          'Use webpack-bundle-analyzer to identify duplicate dependencies',
          'Consider using a monorepo shared package for common utilities',
          'Review and consolidate similar dependencies'
        ]
      });
    }
    
    // Too many chunks
    if (analysis.chunkCount > 20) {
      recommendations.push({
        app: appName,
        type: 'chunk-optimization',
        severity: 'low',
        message: `High number of chunks (${analysis.chunkCount}). Consider chunk optimization.`,
        suggestions: [
          'Optimize splitChunks configuration',
          'Group related modules into fewer chunks',
          'Use chunk naming for better caching',
          'Consider HTTP/2 push for critical chunks'
        ]
      });
    }
    
    return recommendations;
  }

  // Generate human-readable report
  generateHumanReadableReport(report) {
    let output = `
# Bundle Optimization Report
Generated: ${new Date(report.timestamp).toLocaleString()}

## Summary
`;
    
    for (const [appName, analysis] of Object.entries(report.apps)) {
      output += `
### ${appName.toUpperCase()} App
- **Total Bundle Size**: ${analysis.totalSizeFormatted}
- **Assets**: ${analysis.assetCount}
- **Modules**: ${analysis.moduleCount}
- **Chunks**: ${analysis.chunkCount}

#### Largest Assets:
${analysis.largestAssets.slice(0, 5).map(asset => 
  `- ${asset.name}: ${asset.sizeFormatted}`
).join('\n')}

#### Largest Modules:
${analysis.largestModules.slice(0, 5).map(module => 
  `- ${module.name}: ${module.sizeFormatted}`
).join('\n')}
`;
    }
    
    output += `
## Optimization Recommendations

`;
    
    report.recommendations.forEach((rec, index) => {
      output += `
### ${index + 1}. ${rec.app.toUpperCase()} - ${rec.type.replace('-', ' ').toUpperCase()}
**Severity**: ${rec.severity.toUpperCase()}
**Issue**: ${rec.message}

**Suggestions**:
${rec.suggestions.map(suggestion => `- ${suggestion}`).join('\n')}
`;
    });
    
    output += `
## Next Steps
1. Implement code splitting for large bundles
2. Optimize images and use modern formats
3. Configure webpack splitChunks properly
4. Remove unused dependencies
5. Set up bundle size monitoring in CI/CD
6. Consider using a CDN for static assets
7. Implement progressive loading strategies
`;
    
    const reportPath = `bundle-optimization-report-${Date.now()}.md`;
    fs.writeFileSync(reportPath, output);
    console.log(`📄 Human-readable report saved to ${reportPath}`);
  }

  // Format bytes to human readable
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// CLI usage
if (require.main === module) {
  const analyzer = new BundleAnalyzer();
  
  const command = process.argv[2];
  const appName = process.argv[3];
  
  if (command === 'analyze') {
    if (appName) {
      analyzer.analyzeApp(appName).catch(console.error);
    } else {
      analyzer.analyzeAll().catch(console.error);
    }
  } else {
    console.log(`
Usage:
  node bundle-analyzer.js analyze [app-name]
  
Examples:
  node bundle-analyzer.js analyze web
  node bundle-analyzer.js analyze
    `);
  }
}

module.exports = BundleAnalyzer;