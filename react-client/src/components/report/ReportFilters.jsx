export default function ReportFilters({ filters, uniqueApis, onChange, onReset }) {
  return (
    <div className="grid">
      <div>
        <label>API Name
          <select value={filters.apiName} onChange={e => onChange({ apiName: e.target.value })}>
            <option value="">All APIs</option>
            {uniqueApis.map(api => <option key={api} value={api}>{api}</option>)}
          </select>
        </label>
      </div>
      <div>
        <label>Start Date <input type="date" value={filters.startDate} onChange={e => onChange({ startDate: e.target.value })} /></label>
        <label>End Date <input type="date" value={filters.endDate} onChange={e => onChange({ endDate: e.target.value })} /></label>
      </div>
      <div>
        <label>Top N <input type="number" min={1} value={filters.topN} onChange={e => onChange({ topN: parseInt(e.target.value) || 10 })} /></label>
      </div>
      <div>
        <label>Sort By
          <select value={filters.sortBy} onChange={e => onChange({ sortBy: e.target.value })}>
            <option value="total">Total</option>
            <option value="have">Have</option>
            <option value="nohave">No Have</option>
            <option value="pages">Pages</option>
          </select>
        </label>
        <label>Order
          <select value={filters.sortOrder} onChange={e => onChange({ sortOrder: e.target.value })}>
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </label>
      </div>
      <div style={{ display: 'flex', alignItems: 'end' }}>
        <button onClick={onReset} style={{ background: '#ef4444' }}>Reset Filters</button>
      </div>
    </div>
  )
}

