import React, { useState, useEffect, useCallback } from 'react';
import '../TiktokDataViewer.css';

const TiktokDataViewer = () => {
    const [allData, setAllData] = useState({});
    const [activeFile, setActiveFile] = useState(null);
    const [filteredData, setFilteredData] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('default');
    const [selectedImageUrl, setSelectedImageUrl] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [selectedHashtags, setSelectedHashtags] = useState([]);

    const videosPerPage = 12;

    const activeTiktokData = React.useMemo(() => allData[activeFile] || [], [allData, activeFile]);

    const loadInitialData = useCallback(async () => {
        try {
            const response = await fetch('/data/tiktok/wendy_chanz0102.raw.json');
            if (!response.ok) {
                throw new Error('Failed to load initial data');
            }
            const data = await response.json();
            const fileName = 'wendy_chanz0102.raw.json';
            setAllData({ [fileName]: data });
            setActiveFile(fileName);
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }, []);

    useEffect(() => {
        if (Object.keys(allData).length === 0) {
            loadInitialData();
        }
    }, [allData, loadInitialData]);

    const handleFileUpload = (files) => {
        const newFilesData = {};
        const fileArray = Array.from(files);

        fileArray.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    newFilesData[file.name] = data;

                    if (Object.keys(newFilesData).length === fileArray.length) {
                        setAllData(prevData => ({ ...prevData, ...newFilesData }));
                        setActiveFile(fileArray[0].name);
                    }
                } catch (error) {
                    alert(`Error parsing ${file.name}: ${error.message}`);
                }
            };
            reader.readAsText(file);
        });
    };

    const handleImageSelect = (imageUrl, index) => {
        setSelectedImageUrl(imageUrl);
        setSelectedIndex(index);
    };

    const goToPrevImage = useCallback(() => {
        if (filteredData.length === 0) return;
        const newIndex = (selectedIndex - 1 + filteredData.length) % filteredData.length;
        setSelectedIndex(newIndex);
        setSelectedImageUrl(filteredData[newIndex]?.video?.cover || null);
    }, [filteredData, selectedIndex]);

    const goToNextImage = useCallback(() => {
        if (filteredData.length === 0) return;
        const newIndex = (selectedIndex + 1) % filteredData.length;
        setSelectedIndex(newIndex);
        setSelectedImageUrl(filteredData[newIndex]?.video?.cover || null);
    }, [filteredData, selectedIndex]);

    useEffect(() => {
        if (!selectedImageUrl) return;
        const onKeyDown = (e) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                goToPrevImage();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                goToNextImage();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setSelectedImageUrl(null);
                setSelectedIndex(-1);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [selectedImageUrl, goToPrevImage, goToNextImage]);

    useEffect(() => {
        if (selectedIndex >= 0 && selectedIndex < filteredData.length) {
            const url = filteredData[selectedIndex]?.video?.cover || null;
            if (url !== selectedImageUrl) setSelectedImageUrl(url);
        } else if (selectedImageUrl) {
            setSelectedImageUrl(null);
            setSelectedIndex(-1);
        }
    }, [filteredData, selectedIndex]);

    const stats = {
        totalVideos: activeTiktokData.length,
        totalViews: activeTiktokData.reduce((sum, video) => sum + (video.stats?.playCount || 0), 0),
        totalLikes: activeTiktokData.reduce((sum, video) => sum + (video.stats?.diggCount || 0), 0),
        totalComments: activeTiktokData.reduce((sum, video) => sum + (video.stats?.commentCount || 0), 0),
        totalShares: activeTiktokData.reduce((sum, video) => sum + (video.stats?.shareCount || 0), 0),
        totalCollections: activeTiktokData.reduce((sum, video) => sum + (video.stats?.collectCount || 0), 0)
    };

    const author = activeTiktokData.length > 0 ? activeTiktokData[0].author : null;
    const authorStats = activeTiktokData.length > 0 ? activeTiktokData[0].authorStats : null;

    useEffect(() => {
        let data = [...activeTiktokData];

        // Apply top-level filters
        if (activeFilter === 'pinned') {
            data = data.filter(video => video.isPinnedItem);
        } else if (activeFilter === 'recent') {
            data.sort((a, b) => b.createTime - a.createTime);
        } else if (activeFilter === 'popular') {
            data.sort((a, b) => (b.stats?.playCount || 0) - (a.stats?.playCount || 0));
        }

        // Apply detailed sorting
        switch (sortOrder) {
            case 'views_desc':
                data.sort((a, b) => (b.stats?.playCount || 0) - (a.stats?.playCount || 0));
                break;
            case 'views_asc':
                data.sort((a, b) => (a.stats?.playCount || 0) - (b.stats?.playCount || 0));
                break;
            case 'likes_desc':
                data.sort((a, b) => (b.stats?.diggCount || 0) - (a.stats?.diggCount || 0));
                break;
            case 'likes_asc':
                data.sort((a, b) => (a.stats?.diggCount || 0) - (b.stats?.diggCount || 0));
                break;
            case 'date_desc':
                data.sort((a, b) => b.createTime - a.createTime);
                break;
            case 'date_asc':
                data.sort((a, b) => a.createTime - b.createTime);
                break;
            default:
                break;
        }

        // Apply search term filter
        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            data = data.filter(video =>
                video.desc?.toLowerCase().includes(lowercasedFilter) ||
                video.challenges?.some(challenge =>
                    challenge.title.toLowerCase().includes(lowercasedFilter)
                ) ||
                video.music?.title?.toLowerCase().includes(lowercasedFilter)
            );
        }
        
        // Apply hashtag filter
        if (selectedHashtags.length > 0) {
            data = data.filter(video =>
                video.challenges?.some(challenge =>
                    selectedHashtags.includes(challenge.title)
                )
            );
        }
        
        setFilteredData(data);
        setCurrentPage(1);
    }, [searchTerm, activeTiktokData, activeFilter, sortOrder, selectedHashtags]);

    const totalPages = Math.ceil(filteredData.length / videosPerPage);
    const startIndex = (currentPage - 1) * videosPerPage;
    const endIndex = startIndex + videosPerPage;
    const videosToShow = filteredData.slice(startIndex, endIndex);

    return (
        <div className="container">
            <div className="header">
                <h1>🎵 TikTok Data Viewer</h1>
                <p>Comprehensive analysis of {activeFile ? `"${activeFile}"` : 'TikTok content'}</p>
            </div>

            <div className="search-filter">
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search videos, hashtags, or content..."
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="filter-buttons">
                    <button className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveFilter('all')}>All Videos</button>
                    <button className={`filter-btn ${activeFilter === 'pinned' ? 'active' : ''}`} onClick={() => setActiveFilter('pinned')}>Pinned</button>
                    <button className={`filter-btn ${activeFilter === 'recent' ? 'active' : ''}`} onClick={() => setActiveFilter('recent')}>Recent</button>
                    <button className={`filter-btn ${activeFilter === 'popular' ? 'active' : ''}`} onClick={() => setActiveFilter('popular')}>Popular</button>
                </div>
                <HashtagFilter 
                    videos={activeTiktokData} 
                    onHashtagSelect={setSelectedHashtags} 
                    selectedHashtags={selectedHashtags}
                />
            </div>

            <div className="file-upload-section">
                <div className="section-title">📁 Load Data</div>
                <div className="upload-area" onClick={() => document.getElementById('jsonFileInput').click()}>
                    <input 
                        type="file" 
                        id="jsonFileInput" 
                        accept=".json" 
                        multiple
                        onChange={(e) => handleFileUpload(e.target.files)} 
                        style={{ display: 'none' }} 
                    />
                    <p>Click to upload or drag and drop one or more JSON files here</p>
                </div>
            </div>

            <div className="stats-overview">
                <StatCard number={stats.totalVideos} label="Total Videos" />
                <StatCard number={stats.totalViews} label="Total Views" />
                <StatCard number={stats.totalLikes} label="Total Likes" />
                <StatCard number={stats.totalComments} label="Total Comments" />
                <StatCard number={stats.totalShares} label="Total Shares" />
                <StatCard number={stats.totalCollections} label="Total Collections" />
            </div>

            <AuthorSection author={author} stats={authorStats} />

            <div className="content-section">
                <div className="section-header">
                    <div className="section-title">📹 Videos</div>
                    <div className="sort-options">
                        <label htmlFor="sortOrder">Sort by:</label>
                        <select id="sortOrder" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                            <option value="default">Default</option>
                            <option value="views_desc">Views (High to Low)</option>
                            <option value="views_asc">Views (Low to High)</option>
                            <option value="likes_desc">Likes (High to Low)</option>
                            <option value="likes_asc">Likes (Low to High)</option>
                            <option value="date_desc">Date (Newest First)</option>
                            <option value="date_asc">Date (Oldest First)</option>
                        </select>
                    </div>
                </div>
                <VideoGrid videos={videosToShow} onImageSelect={handleImageSelect} startIndex={startIndex} />
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>

            <div className="content-section">
                <div className="section-title">📂 Loaded Datasets</div>
                <div className="file-switcher">
                    {Object.keys(allData).length > 0 ? (
                        Object.keys(allData).map(fileName => (
                            <button
                                key={fileName}
                                className={`file-btn ${activeFile === fileName ? 'active' : ''}`}
                                onClick={() => setActiveFile(fileName)}
                            >
                                {fileName}
                            </button>
                        ))
                    ) : (
                        <p>No data loaded. Please upload one or more JSON files.</p>
                    )}
                </div>
            </div>

            {selectedImageUrl && (
                <ImageModal
                    imageUrl={selectedImageUrl}
                    onClose={() => {
                        setSelectedImageUrl(null);
                        setSelectedIndex(-1);
                    }}
                    onPrev={goToPrevImage}
                    onNext={goToNextImage}
                />
            )}
        </div>
    );
};

const ImageModal = ({ imageUrl, onClose, onPrev, onNext }) => (
    <div className="image-modal-overlay" onClick={onClose}>
        <button className="nav-btn prev" onClick={(e) => { e.stopPropagation(); onPrev(); }}>‹</button>
        <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <img src={imageUrl} alt="Enlarged cover" />
            <button className="close-modal-btn" onClick={onClose}>×</button>
        </div>
        <button className="nav-btn next" onClick={(e) => { e.stopPropagation(); onNext(); }}>›</button>
    </div>
);

const StatCard = ({ number, label }) => (
    <div className="stat-card">
        <div className="stat-number">{number.toLocaleString()}</div>
        <div className="stat-label">{label}</div>
    </div>
);

const AuthorSection = ({ author, stats }) => {
    if (!author || !stats) return <div className="loading">Loading author information...</div>;
    return (
        <div className="author-section">
            <div className="section-title">👤 Author Information</div>
            <div className="author-info">
                <img src={author.avatarLarger} alt={author.nickname} className="author-avatar" onError={(e) => e.target.src = 'https://via.placeholder.com/80x80/ff0050/ffffff?text=?'} />
                <div className="author-details">
                    <h3>{author.nickname}</h3>
                    <p className="author-signature">{author.signature}</p>
                    <p><strong>Username:</strong> @{author.uniqueId}</p>
                    <p><strong>User ID:</strong> {author.id}</p>
                    <p><strong>Verified:</strong> {author.verified ? '✅ Yes' : '❌ No'}</p>
                </div>
                <div className="author-stats">
                    <AuthorStat number={stats.followerCount} label="Followers" />
                    <AuthorStat number={stats.followingCount} label="Following" />
                    <AuthorStat number={stats.videoCount} label="Videos" />
                    <AuthorStat number={stats.heartCount} label="Total Hearts" />
                </div>
            </div>
        </div>
    );
};

const AuthorStat = ({ number, label }) => (
    <div className="author-stat">
        <div className="author-stat-number">{number.toLocaleString()}</div>
        <div className="author-stat-label">{label}</div>
    </div>
);

const VideoGrid = ({ videos, onImageSelect, startIndex }) => {
    if (videos.length === 0) return <div className="error">No videos found.</div>;
    return (
        <div className="video-grid">
            {videos.map((video, idx) => (
                <VideoCard key={video.id} video={video} index={startIndex + idx} onImageSelect={onImageSelect} />
            ))}
        </div>
    );
};

const VideoCard = ({ video, index, onImageSelect }) => (
    <div className="video-card">
        <img 
            src={video.video.cover} 
            alt="Video cover" 
            className="video-cover" 
            onClick={() => onImageSelect(video.video.cover, index)}
            onError={(e) => e.target.src = 'https://via.placeholder.com/350x200/f0f0f0/999999?text=No+Cover'} 
        />
        <div className="video-info">
            <div className="video-title">{video.desc || 'No description'}</div>
            <div className="video-stats">
                <span>👁️ {(video.stats?.playCount || 0).toLocaleString()}</span>
                <span>❤️ {(video.stats?.diggCount || 0).toLocaleString()}</span>
                <span>💬 {(video.stats?.commentCount || 0).toLocaleString()}</span>
            </div>
            <div className="video-hashtags">
                {(video.challenges || []).map(challenge =>
                    <span key={challenge.id} className="hashtag">#{challenge.title}</span>
                )}
            </div>
            <div className="video-meta">
                <div><strong>Duration:</strong> {video.video.duration}s</div>
                <div><strong>Quality:</strong> {video.video.definition}</div>
                <div><strong>Created:</strong> {new Date(video.createTime * 1000).toLocaleDateString()}</div>
                <div><strong>Music:</strong> {video.music?.title || 'Original'}</div>
                {video.isPinnedItem && <div><strong>📌 Pinned Video</strong></div>}
            </div>
        </div>
    </div>
);

const HashtagFilter = ({ videos, onHashtagSelect, selectedHashtags }) => {
    const allHashtags = React.useMemo(() => {
        const hashtags = new Set();
        videos.forEach(video => {
            if (video.challenges) {
                video.challenges.forEach(challenge => {
                    if (challenge.title) {
                        hashtags.add(challenge.title);
                    }
                });
            }
        });
        return Array.from(hashtags).sort();
    }, [videos]);

    if (allHashtags.length === 0) return null;

    return (
        <div className="hashtag-filter">
            <div className="hashtag-filter-header">
                <h4>Filter by Hashtag</h4>
                <button className="clear-filter-btn" onClick={() => onHashtagSelect([])}>Clear Filter</button>
            </div>
            <div className="hashtag-filter-list">
                {allHashtags.map(hashtag => (
                    <button
                        key={hashtag}
                        className={`hashtag-filter-btn ${selectedHashtags.includes(hashtag) ? 'active' : ''}`}
                        onClick={() => onHashtagSelect(prev => {
                            if (prev.includes(hashtag)) {
                                return prev.filter(h => h !== hashtag);
                            } else {
                                return [...prev, hashtag];
                            }
                        })}
                    >
                        #{hashtag}
                    </button>
                ))}
            </div>
        </div>
    );
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => (
    <div className="pagination">
        <button className="page-btn" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>Previous</button>
        <div className="page-info">
            <span>Page {currentPage} of {totalPages}</span>
        </div>
        <button className="page-btn" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
    </div>
);

export default TiktokDataViewer;
