
import React, { useState, useEffect, useMemo } from 'react';

const StoryViewer = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter and Sort State
  const [sortCriteria, setSortCriteria] = useState('default');
  const [apiFilter, setApiFilter] = useState('all');

  // Pagination State
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/ig_user_stories_report.jsonl');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        if (!text.trim()) {
          setData([]);
          return;
        }
        const lines = text.trim().split('\n');
        const parsedData = [];
        for (const line of lines) {
          try {
            if (line.trim()) parsedData.push(JSON.parse(line));
          } catch (e) {
            console.error("Skipping corrupted line:", line, "Error:", e);
          }
        }
        setData(parsedData);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const apiNames = useMemo(() => ['all', ...new Set(data.map(item => item.apiName))], [data]);

  const getMediaCount = (item) => item.report?.[0]?.total || 0;
  const getPageCount = (item) => item.report?.[0]?.pages || 0;

  const filteredData = useMemo(() => {
    return data.filter(item => apiFilter === 'all' || item.apiName === apiFilter);
  }, [data, apiFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [apiFilter, itemsPerPage]);

  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    switch (sortCriteria) {
      case 'media_desc':
        sorted.sort((a, b) => getMediaCount(b) - getMediaCount(a));
        break;
      case 'media_asc':
        sorted.sort((a, b) => getMediaCount(a) - getMediaCount(b));
        break;
      case 'pages_desc':
        sorted.sort((a, b) => getPageCount(b) - getPageCount(a));
        break;
      case 'pages_asc':
        sorted.sort((a, b) => getPageCount(a) - getPageCount(b));
        break;
      default:
        break;
    }
    return sorted;
  }, [filteredData, sortCriteria]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  if (loading) return <p>Loading data...</p>;
  if (error) return <pre style={{ color: 'red', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{error}</pre>;

  // Create a unique, comma-separated string of URLs for the current page
  const uniqueUrlsOnPage = [...new Set(
    paginatedData.flatMap(item => 
      item.report?.map(r => r.url).filter(Boolean) || []
    )
  )];
  const urlDisplayString = uniqueUrlsOnPage.join(', ');

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px' }}>
      <h1>Instagram Stories Report</h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '20px', alignItems: 'center' }}>
        <div>
          <label htmlFor="apiFilter">API: </label>
          <select id="apiFilter" value={apiFilter} onChange={(e) => setApiFilter(e.target.value)}>
            {apiNames.map(name => <option key={name} value={name}>{name || 'N/A'}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="sort">Sort by: </label>
          <select id="sort" value={sortCriteria} onChange={(e) => setSortCriteria(e.target.value)}>
            <option value="default">Default</option>
            <option value="media_desc">Media Count (Most)</option>
            <option value="media_asc">Media Count (Least)</option>
            <option value="pages_desc">Page Count (Most)</option>
            <option value="pages_asc">Page Count (Least)</option>
          </select>
        </div>
        <div>
          <label htmlFor="itemsPerPage">Items Per Page: </label>
          <select id="itemsPerPage" value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); }}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={1000}>1000</option>
            <option value={10000}>10000</option>
            <option value={100000}>100000</option> 
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
          Previous
        </button>
        <span style={{ margin: '0 10px' }}>
          Page {currentPage} of {totalPages}
        </span>
        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
          Next
        </button>
      </div>

      <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '8px', wordBreak: 'break-all' }}>
        {urlDisplayString}
      </div>
    </div>
  );
};

export default StoryViewer;
