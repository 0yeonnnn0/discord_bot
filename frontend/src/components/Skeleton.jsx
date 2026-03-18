export function DashboardSkeleton() {
  return (
    <div className="stagger">
      <div className="page-header">
        <div className="skeleton-line h-8 w-1/3" />
        <div className="skeleton-line w-1/2" style={{ marginTop: 12 }} />
      </div>

      <div className="card-grid">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-line w-1/2" style={{ marginBottom: 16 }} />
            <div className="skeleton-line h-8 w-2/3" />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 40 }}>
        <div className="skeleton-line w-1/3" style={{ marginBottom: 20, height: 12 }} />
        <div className="skeleton-card">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton-line w-full" style={{ marginTop: i > 0 ? 12 : 0 }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function LogsSkeleton() {
  return (
    <div className="stagger">
      <div className="page-header">
        <div className="skeleton-line h-8 w-1/4" />
        <div className="skeleton-line w-1/3" style={{ marginTop: 12 }} />
      </div>

      <div className="skeleton-line" style={{ width: 150, height: 36, marginBottom: 24, borderRadius: 8 }} />

      <div className="skeleton-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="skeleton-line w-full" style={{ height: 44, borderRadius: 0 }} />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="skeleton-line w-full" style={{ height: 48, borderRadius: 0, marginTop: 1 }} />
        ))}
      </div>
    </div>
  )
}

export function SettingsSkeleton() {
  return (
    <div className="stagger">
      <div className="page-header">
        <div className="skeleton-line h-8 w-1/4" />
        <div className="skeleton-line w-1/3" style={{ marginTop: 12 }} />
      </div>

      <div className="command-center">
        <div>
          <div className="skeleton-card" style={{ marginBottom: 20 }}>
            <div className="skeleton-line w-1/3" style={{ marginBottom: 20 }} />
            <div className="skeleton-line w-full h-6" />
          </div>
          <div className="skeleton-card" style={{ marginBottom: 20 }}>
            <div className="skeleton-line w-1/3" style={{ marginBottom: 20 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="skeleton-line h-8" />
              <div className="skeleton-line h-8" />
            </div>
          </div>
          <div className="skeleton-card">
            <div className="skeleton-line w-1/3" style={{ marginBottom: 20 }} />
            <div className="skeleton-line w-full" style={{ height: 280 }} />
          </div>
        </div>
        <div className="skeleton-card" style={{ height: 450 }}>
          <div className="skeleton-line w-1/3" style={{ marginBottom: 20 }} />
          <div className="skeleton-line w-full" style={{ height: 320 }} />
          <div className="skeleton-line w-full h-8" style={{ marginTop: 16 }} />
        </div>
      </div>
    </div>
  )
}
