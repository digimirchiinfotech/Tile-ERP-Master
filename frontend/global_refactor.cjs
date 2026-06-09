const fs = require('fs');
const path = require('path');

const componentsDir = 'src/components';

const oldPattern = /<Card className="text-center h-100 shadow-sm border-0 stats-card">\s*<Card\.Body className="p-2 d-flex flex-column align-items-center justify-content-center">\s*<div className="icon-box bg-([a-zA-Z0-9_-]+)-light mb-1 mx-auto" style={{ width: '32px', height: '32px' }}><([a-zA-Z0-9_-]+) size=\{16\} className="text-([a-zA-Z0-9_-]+)" \/><\/div>\s*<h5 className="fw-bold mb-0">(.*?)<\/h5>\s*<p className="text-muted extra-small mb-0 text-nowrap">(.*?)<\/p>\s*<\/Card\.Body>\s*<\/Card>/g;

const newReplacement = `<Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-$1-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}><$2 size={18} className="text-$3" /></div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>$5</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>$4</h5>
              </div>
            </Card.Body>
          </Card>`;

const rowPattern = /<Row className="mb-4 g-2 flex-nowrap overflow-auto pb-2 stats-row-container">/g;
const rowReplacement = '<Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">';

function walkSync(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach(function (name) {
        var filePath = path.join(currentDirPath, name);
        var stat = fs.statSync(filePath);
        if (stat.isFile() && filePath.endsWith('.jsx')) {
            callback(filePath, stat);
        } else if (stat.isDirectory()) {
            walkSync(filePath, callback);
        }
    });
}

walkSync(componentsDir, function(filePath, stat) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    content = content.replace(rowPattern, rowReplacement);
    content = content.replace(oldPattern, newReplacement);
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
});
