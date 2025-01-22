import React, { useState, useEffect, useCallback } from 'react';
import { Link, Search, RefreshCw, ChevronDown, ChevronRight, X } from 'lucide-react';
import { TFile, App } from 'obsidian';
import type ObsidianClipperCatalog from './main';

interface ClipperCatalogProps {
  app: App;
  plugin: ObsidianClipperCatalog;
}

interface Article {
  title: string;
  url: string;
  path: string;
  date: number;
  tags: string[];
  basename: string;
  content: string;
}

interface SortConfig {
  key: keyof Article;
  direction: 'asc' | 'desc';
}

interface AdvancedSettings {
  ignoredDirectories: string[];
  isExpanded: boolean;
}

const ArticleTitle = ({ file, content, title }: { file: TFile, content: string, title: string }) => {
  const isUntitled = /^Untitled( \d+)?$/.test(file.basename);
  const headerMatch = content.match(/^#+ (.+)$/m);
  
  if (isUntitled && headerMatch) {
    return (
      <div className="cc-flex cc-flex-col">
        <span>{headerMatch[1].trim()}</span>
        <span className="cc-text-xs cc-text-muted">({file.basename})</span>
      </div>
    );
  }
  
  return <span>{file.basename}</span>;
};

const ClipperCatalog: React.FC<ClipperCatalogProps> = ({ app, plugin }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>(() => {
    // Try to load saved settings from localStorage
    const savedSettings = localStorage.getItem('clipper-catalog-advanced-settings');
    return savedSettings ? JSON.parse(savedSettings) : {
      ignoredDirectories: [],
      isExpanded: false
    };
  });
  const [newDirectory, setNewDirectory] = useState('');


  // Save advanced settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('clipper-catalog-advanced-settings', JSON.stringify(advancedSettings));
  }, [advancedSettings]);

  // Helper function to check if a path should be ignored
  const isPathIgnored = (filePath: string): boolean => {
    return advancedSettings.ignoredDirectories.some(dir => {
      // Normalize both paths to use forward slashes and remove trailing slashes
      const normalizedDir = dir.replace(/\\/g, '/').replace(/\/$/, '');
      const normalizedPath = filePath.replace(/\\/g, '/');
      
      // Split the paths into segments
      const dirParts = normalizedDir.split('/');
      const pathParts = normalizedPath.split('/');
      
      // Check if the number of path parts is at least equal to directory parts
      if (pathParts.length < dirParts.length) return false;
      
      // Compare each segment
      for (let i = 0; i < dirParts.length; i++) {
        if (dirParts[i].toLowerCase() !== pathParts[i].toLowerCase()) {
          return false;
        }
      }
      
      // Only match if we've matched all segments exactly
      return dirParts.length === pathParts.length - 1 || // Directory contains files
              dirParts.length === pathParts.length;       // Directory is exactly matched
    });
  };
  
  const loadArticles = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      const articleFiles: Article[] = [];
      const files = app.vault.getMarkdownFiles();

      for (const file of files) {
        try {
          if (isPathIgnored(file.parent?.path || '')) {
            continue;
          }

          const content = await app.vault.read(file);
          const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
          
          if (frontmatterMatch) {
            const frontmatter = frontmatterMatch[1];            
            const sourcePropertyPattern = `^${plugin.settings.sourcePropertyName}:\\s*["']?([^"'\\s]+)["']?\\s*$`
            const sourcePropertyRegex = new RegExp(sourcePropertyPattern, 'm')
            const sourceMatch = frontmatter.match(sourcePropertyRegex);

            if (sourceMatch) {
              const content = await app.vault.read(file);
              const title = file.basename;

              let tags: string[] = [];
              
              // Get all hashtags from the entire content (including frontmatter)
              const hashtagMatches = content.match(/#[\w\d-_/]+/g) || [];


              // Add content tags (requiring # prefix)
              tags = [...new Set(hashtagMatches.map(tag => tag.slice(1)))].filter(Boolean);



              // Remove duplicates using Set
              tags = [...new Set(tags)].filter(Boolean);

              articleFiles.push({
                title,
                url: sourceMatch[1],
                path: file.path,
                date: file.stat.ctime,
                tags,
                basename: file.basename,
                content: content
              });
            }
          }
        } catch (error) {
          console.error(`Error processing file ${file.path}:`, error);
        }
      }

      setArticles(articleFiles);
    } catch (error) {
      setError("Failed to load articles");
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [app.vault, advancedSettings.ignoredDirectories]);


  // Initial load
  useEffect(() => {
    loadArticles();
  }, [loadArticles, advancedSettings.ignoredDirectories]);

  
  useEffect(() => {
    const intervalId = setInterval(() => {
      loadArticles();
    }, 60000);
  
    return () => clearInterval(intervalId);
  }, [loadArticles]);

  if (error) {
    return (
      <div className="cc-flex cc-justify-center cc-items-center cc-p-4 cc-text-red-400">
        {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="cc-flex cc-justify-center cc-items-center cc-p-4 cc-gap-2">
        <div className="cc-animate-spin cc-h-4 cc-w-4">
          <RefreshCw className="cc-h-4 cc-w-4" />
        </div>
        <span className="cc-text-sm">Loading articles...</span>
      </div>
    );
  }

  const handleRefresh = () => {
    loadArticles();
  };

  const handleSort = (key: keyof Article) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedArticles = [...articles].sort((a, b) => {
    if (sortConfig.key === 'date') {
      return sortConfig.direction === 'asc' 
        ? a.date - b.date 
        : b.date - a.date;
    }
    
    const aValue = String(a[sortConfig.key]).toLowerCase();
    const bValue = String(b[sortConfig.key]).toLowerCase();
    
    if (sortConfig.direction === 'asc') {
      return aValue.localeCompare(bValue);
    }
    return bValue.localeCompare(aValue);
  });

  const filteredArticles = sortedArticles.filter(article => 
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
    searchTerm.startsWith('#') && article.tags.some(tag => 
      tag.toLowerCase() === searchTerm.slice(1).toLowerCase()
    )
  );

  const getSortIcon = (key: keyof Article) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? '↑' : '↓';
    }
    return null;
  };

  const openArticle = (path: string) => {
    const file = app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      const leaf = app.workspace.getLeaf(false);
      leaf.openFile(file);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleAddDirectory = () => {
    if (!newDirectory.trim()) return;

    // Split by commas and clean up each directory path
    const directoriesToAdd = newDirectory
      .split(',')
      .map(dir => dir.trim())
      .filter(dir => dir.length > 0);

    if (directoriesToAdd.length === 0) return;

    setAdvancedSettings(prev => {
      const updatedDirectories = [...prev.ignoredDirectories];
      
      directoriesToAdd.forEach(dir => {
        if (!updatedDirectories.includes(dir)) {
          updatedDirectories.push(dir);
        }
      });

      return {
        ...prev,
        ignoredDirectories: updatedDirectories
      };
    });

    setNewDirectory('');
  };

  const handleRemoveDirectory = (dir: string) => {
    setAdvancedSettings(prev => ({
      ...prev,
      ignoredDirectories: prev.ignoredDirectories.filter(d => d !== dir)
    }));
    // Articles will reload automatically due to the useEffect dependency on ignoredDirectories
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newDirectory.trim()) {
      handleAddDirectory();
    }
  };

  const toggleAdvancedSettings = () => {
    setAdvancedSettings(prev => ({
      ...prev,
      isExpanded: !prev.isExpanded
    }));
  };
  
  const handleClearAllDirectories = () => {
    setAdvancedSettings(prev => ({
      ...prev,
      ignoredDirectories: []
    }));
  };

  const renderAdvancedSettingsHeader = () => {
    const excludedCount = advancedSettings.ignoredDirectories.length;
    
    return (
      <div className="cc-flex cc-items-center cc-justify-between cc-w-full">
        <button
          onClick={toggleAdvancedSettings}
          className="cc-flex cc-items-center cc-gap-1 cc-text-sm cc-font-medium hover:cc-underline cc-text-muted cc-transition-all"
        >
          {advancedSettings.isExpanded ? <ChevronDown className="cc-h-4 cc-w-4" /> : <ChevronRight className="cc-h-4 cc-w-4" />}
          Advanced Search Options
        </button>
        {!advancedSettings.isExpanded && excludedCount > 0 && (
          <em className="cc-text-xs cc-text-muted">
            Note: There {excludedCount === 1 ? 'is' : 'are'} {excludedCount} path{excludedCount === 1 ? '' : 's'} excluded from showing up in the results
          </em>
        )}
      </div>
    );
  };

  return (
    <div className="cc-flex cc-flex-col cc-gap-4">
      <div className="cc-relative">
        {/* Search input container */}
        <div className="cc-flex cc-items-center cc-gap-2 cc-px-4 cc-py-2 cc-rounded-lg clipper-catalog-search">
          <Search className="cc-h-4 cc-w-4 clipper-catalog-icon" />
          <div className="cc-relative cc-flex-1">
            <input
              type="text"
              placeholder="Search articles or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="cc-w-full cc-bg-transparent cc-outline-none cc-text-sm cc-pr-16 clipper-catalog-input"
            />
            {searchTerm && (
              <div 
                onClick={() => setSearchTerm('')}
                className="cc-absolute cc-right-2 cc-top-[20%] cc-flex cc-items-center cc-gap-1 cc-cursor-pointer cc-transition-colors clipper-catalog-clear-btn"
              >
                <svg className="cc-h-3.5 cc-w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="cc-text-xs">clear</span>
              </div>
            )}
          </div>
        </div>

        {/* Advanced Settings Section */}
        <div className="cc-mt-2">
          {renderAdvancedSettingsHeader()}
          
          {advancedSettings.isExpanded && (
            <div className="cc-mt-2 cc-px-4 cc-py-2 cc-rounded-lg clipper-catalog-advanced">
            <div className="cc-flex cc-flex-col cc-gap-3">
              <div className="cc-flex cc-flex-col cc-gap-1">
                <div className="cc-flex cc-items-center cc-gap-2">
                  <input
                    type="text"
                    placeholder="Enter full paths to ignore (comma-separated, e.g., research/links/delago, work/expenses)"
                    value={newDirectory}
                    onChange={(e) => setNewDirectory(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="cc-flex-1 cc-px-2 cc-py-1 cc-text-sm cc-rounded clipper-catalog-input"
                  />
                  <button
                    onClick={handleAddDirectory}
                    disabled={!newDirectory.trim()}
                    className="cc-px-3 cc-py-1 cc-text-sm cc-rounded cc-bg-accent-primary cc-text-on-accent cc-font-medium clipper-catalog-button hover:cc-opacity-90"
                  >
                    Add
                  </button>
                </div>
                <span className="cc-text-xs cc-text-muted">
                  Tip: You can enter multiple paths separated by commas
                </span>
              </div>
              
              {advancedSettings.ignoredDirectories.length > 0 && (
                <div className="cc-flex cc-flex-col cc-gap-2">
                <div className="cc-flex cc-items-center cc-justify-between">
                  <span className="cc-text-xs cc-font-medium">Excluded Paths:</span>
                  <button
                    onClick={handleClearAllDirectories}
                    className="cc-px-3 cc-py-1 cc-text-xs cc-rounded cc-bg-accent-primary cc-text-on-accent cc-font-medium clipper-catalog-button hover:cc-opacity-90"
                  >
                    Clear All Excluded Paths
                  </button>
                </div>
                <div className="cc-flex cc-flex-wrap cc-gap-1.5">
                  {advancedSettings.ignoredDirectories.map((dir) => (
                    <button
                      key={dir}
                      onClick={() => handleRemoveDirectory(dir)}
                      className="cc-inline-flex cc-items-center cc-bg-chip cc-px-3 cc-py-1.5 cc-rounded-full cc-text-xs hover:cc-bg-chip-hover cc-transition-colors cc-cursor-pointer"
                      aria-label={`Remove ${dir} from excluded paths`}
                    >
                      <span className="cc-text-muted">{dir}</span>
                      <span className="cc-ml-2 cc-text-muted cc-opacity-60 cc-text-sm">×</span>
                    </button>
                  ))}
                </div>
              </div>
              )}
            </div>
          </div>
        )}
      </div>
        
        {/* Refresh link */}
        <div className="cc-absolute cc-right-2 cc-top-full cc-mt-1 cc-text-right">
          <span 
            onClick={handleRefresh} 
            className="cc-flex cc-items-center cc-gap-1 cc-text-[10px] cc-cursor-pointer cc-transition-colors cc-justify-end clipper-catalog-refresh"
          >
            <RefreshCw className={`cc-h-2.5 cc-w-2.5 ${isRefreshing ? 'cc-animate-spin' : ''}`} />
            <span className="cc-underline">refresh list</span>
          </span>
        </div>
      </div>
      
      <div className="cc-overflow-x-auto">
        <table className="cc-w-full cc-text-sm">
          <colgroup>
            <col className="cc-w-[30%]" />
            <col className="cc-w-[15%]" />
            <col className="cc-w-[22%]" />
            <col className="cc-w-[20%]" />
            <col className="cc-w-[13%]" />
          </colgroup>
          <thead>
            <tr className="clipper-catalog-header-row">
              <th 
                onClick={() => handleSort('title')}
                className="cc-px-4 cc-py-2 cc-text-left cc-cursor-pointer clipper-catalog-header-cell"
              >
                Note Title {getSortIcon('title')}
              </th>
              <th 
                onClick={() => handleSort('date')}
                className="cc-px-4 cc-py-2 cc-text-left cc-cursor-pointer cc-whitespace-nowrap clipper-catalog-header-cell"
              >
                Date {getSortIcon('date')}
              </th>
              <th 
                onClick={() => handleSort('path')}
                className="cc-px-4 cc-py-2 cc-text-left cc-cursor-pointer clipper-catalog-header-cell"
              >
                Path {getSortIcon('path')}
              </th>
              <th className="cc-px-4 cc-py-2 cc-text-left clipper-catalog-header-cell">
                #Tags
              </th>
              <th className="cc-px-4 cc-py-2 cc-text-left clipper-catalog-header-cell">
                Link
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredArticles.map((article) => (
              <tr key={article.path} className="clipper-catalog-row">
                <td className="cc-px-4 cc-py-2">
                  <span
                    onClick={() => openArticle(article.path)}
                    className="cc-flex cc-items-center cc-gap-2 cc-cursor-pointer cc-transition-colors cc-min-h-[1.5rem] clipper-catalog-title"
                  >
                    <svg 
                      className="cc-h-4 cc-w-4 cc-flex-shrink-0 clipper-catalog-icon" 
                      fill="none" 
                      strokeWidth="2" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {(() => {
                      const abstractFile = app.vault.getAbstractFileByPath(article.path);
                      if (abstractFile instanceof TFile) {
                        return (
                          <ArticleTitle 
                            file={abstractFile}
                            content={article.content || ''}
                            title={article.title}
                          />
                        );
                      }
                      return <span>{article.title}</span>;
                    })()}
                  </span>
                </td>
                <td className="cc-px-4 cc-py-2 clipper-catalog-muted">
                  {formatDate(article.date)}
                </td>
                <td className="cc-px-4 cc-py-2 clipper-catalog-muted">
                  {article.path.split('/').slice(0, -1).join('/')}
                </td>
                <td className="cc-px-4 cc-py-2">
                  <div className="cc-flex cc-gap-1 cc-flex-wrap">
                    {article.tags.map((tag, i) => (
                      <span 
                        key={i}
                        onClick={() => setSearchTerm(`#${tag}`)}
                        className="cc-px-2 cc-py-1 cc-text-xs cc-rounded-full cc-cursor-pointer cc-transition-colors clipper-catalog-tag"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="cc-px-4 cc-py-2">
                <a 
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cc-inline-flex cc-items-center cc-gap-0.5 cc-transition-colors clipper-catalog-link"
                  title={`Go to ${article.url}`}
                >
                  <Link className="cc-h-3 cc-w-3" />
                  <span className="cc-text-xs">Original</span>
                </a>
              </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
  
      {filteredArticles.length === 0 && (
        <div className="cc-text-center cc-py-4 cc-flex cc-flex-col cc-gap-2">
          <div className="clipper-catalog-muted">
            No articles found matching your search.
          </div>
          <div className="cc-text-xs cc-text-muted">
            Note: This catalog shows any markdown files containing a URL in their frontmatter under the property: "{plugin.settings.sourcePropertyName}". 
            You can change this property name in plugin settings to match your preferred clipping workflow.
          </div>
        </div>
      )}
    </div>
  );
};

export default ClipperCatalog;