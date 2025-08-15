export default function ReportTable({ rows }) {
  if (!rows || rows.length === 0) return null
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>API</th>
            <th>Total</th>
            <th>Have</th>
            <th>No Have</th>
            <th>IDs</th>
            <th>Time</th>
            <th>Pages</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item, idx) => (
            <tr key={idx}>
              <td>{item.username}</td>
              <td>{item.apiName}</td>
              <td>{item.total}</td>
              <td>{item.have}</td>
              <td>{item.nohave}</td>
              <td>{Array.isArray(item.ids) ? (item.ids.length > 0 ? item.ids.join(', ') : 'No IDs') : 'No IDs'}</td>
              <td>{item.time}</td>
              <td>{item.pages}</td>
              <td>{(() => { try { const d = new Date(item.timestamp); const utc7 = new Date(d.getTime() + 7*60*60*1000); return utc7.toLocaleString('en-GB', { hour12: false }) } catch { return item.timestamp } })()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

