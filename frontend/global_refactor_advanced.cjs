const fs = require('fs');
const path = require('path');

const componentsDir = 'src/components';

const rowPattern = /<Row className="[^"]*stats-row-container[^"]*">/g;
const rowReplacement = '<Row className="mb-3 g-2 flex-nowrap overflow-auto pb-1 stats-row-container">';

// More permissive regex
const cardPattern = /<Col[^>]*>\s*<Card[^>]*stats-card[^>]*>\s*<Card\.Body[^>]*>\s*<div[^>]*bg-([a-zA-Z0-9_-]+)(?:-light)?(?:.*?)>\s*<([a-zA-Z0-9]+)[^>]*className="text-([a-zA-Z0-9_-]+)"\s*\/>\s*<\/div>\s*<h[45][^>]*>(.*?)<\/h[45]>\s*<p[^>]*>(.*?)<\/p>\s*<\/Card\.Body>\s*<\/Card>\s*<\/Col>/g;

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

function refactorFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Fix Row container
    content = content.replace(rowPattern, rowReplacement);

    // Fix Cards
    content = content.replace(cardPattern, (match, bgColor, iconName, iconColor, value, label) => {
        // bgColor might be 'primary', 'success-light', we want 'primary'
        bgColor = bgColor.replace('-light', '');
        
        return `<Col className="flex-shrink-0" style={{ minWidth: '160px', flex: '1 0 0' }}>
          <Card className="shadow-sm border-0 stats-card">
            <Card.Body className="p-2 d-flex align-items-center gap-2">
              <div className="icon-box bg-${bgColor}-light flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
                <${iconName} size={18} className="text-${iconColor}" />
              </div>
              <div className="text-start">
                <p className="text-muted fw-semibold mb-0 text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.65rem' }}>${label}</p>
                <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>${value}</h5>
              </div>
            </Card.Body>
          </Card>
        </Col>`;
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

walkSync(componentsDir, refactorFile);
