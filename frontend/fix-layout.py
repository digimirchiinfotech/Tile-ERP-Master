import re

with open('src/components/user-management/UserDashboard.jsx', 'r', encoding='utf-8') as f:
    data = f.read()

data = data.replace('<Card className="text-center h-100 shadow-sm border-0 stats-card">', '<Card className="h-100 shadow-sm border-0 stats-card">')
data = data.replace('<Card.Body className="p-2 d-flex flex-column align-items-center justify-content-center">', '<Card.Body className="p-3 d-flex align-items-center gap-3">')
data = re.sub(r'<div className="icon-box bg-(.*?)-light mb-1 mx-auto" style={{ width: \'32px\', height: \'32px\' }}>', r'<div className="icon-box bg-\1-light flex-shrink-0" style={{ width: \'48px\', height: \'48px\', borderRadius: \'12px\' }}>', data)

data = data.replace('size={16} className="text-primary"', 'size={24} className="text-primary"')
data = data.replace('size={16} className="text-success"', 'size={24} className="text-success"')
data = data.replace('size={16} className="text-info"', 'size={24} className="text-info"')

data = data.replace('<h5 className="fw-bold mb-0">', '<h4 className="fw-bold mb-0 text-dark">')
data = data.replace('</h5>', '</h4>')

data = data.replace('<p className="text-muted extra-small mb-0 text-nowrap">', '<p className="text-muted small fw-semibold mb-0 text-uppercase" style={{ letterSpacing: \'1px\' }}>')

# Switch order of p and h4 so the text is above the number
data = re.sub(r'(<h4.*?>.*?</h4>)\s*(<p.*?>.*?</p>)', r'<div>\n                \2\n                \1\n              </div>', data)

with open('src/components/user-management/UserDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(data)
