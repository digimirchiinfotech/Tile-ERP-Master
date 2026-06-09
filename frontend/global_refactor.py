import os
import re

components_dir = 'src/components'

old_pattern = re.compile(
    r'<Card className="text-center h-100 shadow-sm border-0 stats-card">\s*'
    r'<Card\.Body className="p-2 d-flex flex-column align-items-center justify-content-center">\s*'
    r'<div className="icon-box bg-([a-zA-Z0-9_-]+)-light mb-1 mx-auto" style={{ width: \'32px\', height: \'32px\' }}><([a-zA-Z0-9_-]+) size=\{16\} className="text-([a-zA-Z0-9_-]+)" /></div>\s*'
    r'<h5 className="fw-bold mb-0">(.*?)</h5>\s*'
    r'<p className="text-muted extra-small mb-0 text-nowrap">(.*?)</p>\s*'
    r'</Card\.Body>\s*'
    r'</Card>'
)

new_replacement = (
    r'<Card className="shadow-sm border-0 stats-card">\n'
    r'            <Card.Body className="p-2 d-flex align-items-center gap-2">\n'
    r'              <div className="icon-box bg-\1-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: \'36px\', height: \'36px\', borderRadius: \'8px\' }}><\2 size={18} className="text-\3" /></div>\n'
    r'              <div className="text-start">\n'
    r'                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: \'0.5px\', fontSize: \'0.65rem\' }}>\5</p>\n'
    r'                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: \'1.1rem\' }}>\4</h5>\n'
    r'              </div>\n'
    r'            </Card.Body>\n'
    r'          </Card>'
)

# And also row modifications
row_pattern = re.compile(
    r'<Row className="mb-4 g-2 flex-nowrap overflow-auto pb-2 stats-row-container">'
)
row_replacement = r'<Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">'

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    original = content
    content = row_pattern.sub(row_replacement, content)
    content = old_pattern.sub(new_replacement, content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filepath}")

for root, _, files in os.walk(components_dir):
    for file in files:
        if file.endswith('.jsx'):
            process_file(os.path.join(root, file))
