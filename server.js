const express = require('express');
const fs = require('fs');
const xml2js = require('xml2js');
const app = express();
const port = process.env.PORT || 3001
const path = require('path');

// Serve static files from the current directory
app.use(express.static(__dirname));

// Serve static files from the 'images' directory
app.use('/images', express.static(path.join(__dirname, 'images')));

// Route to serve transcription data as JSON
app.get('/transcriptions', (req, res) => {
    fs.readFile('BB749.1.ms.xml', 'utf8', (err, xmlData) => {
        if (err) {
            res.status(500).json({ error: 'Error reading XML file' });
            return;
        }

        parseXml(xmlData, (err, transcriptions) => {
            if (err) {
                res.status(500).json({ error: 'Error parsing XML file' });
                return;
            }

            res.json(transcriptions || []);
        });
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

function parseXml(xmlData, callback) {
    const parser = new xml2js.Parser();
    parser.parseString(xmlData, (err, result) => {
        if (err) {
            console.error('Error in parseString:', err);
            callback(err);
        } else {
            console.log('XML parsed successfully:', result);

            if (result && result.bad && result.bad.objdesc && result.bad.objdesc[0]) {
                const desc = result.bad.objdesc[0].desc;
                if (desc) {
                    const transcriptions = [];
                    
                    desc.forEach(page => {
                        if (page && page.phystext && page.phystext[0] && page.phystext[0].zone && page.$) {
                            const pageId = page.$.id;
                            const dbi = page.$.dbi;
                            const zones = page.phystext[0].zone;
                            
                            if (dbi) {
                                zones.forEach(zone => {
                                    // Look for Blake marginalia zones
                                    if (zone.$ && zone.$.type === 'Blake' && zone.zone) {
                                        zone.zone.forEach(marginaliaZone => {
                                            if (marginaliaZone.$ && marginaliaZone.$.points && marginaliaZone.lg && marginaliaZone.lg[0] && marginaliaZone.lg[0].l) {
                                                const points = marginaliaZone.$.points.split(' ').map(point => point.split(',').map(Number));
                                                const top = Math.min(...points.map(p => p[1]));
                                                const left = Math.min(...points.map(p => p[0]));
                                                const width = Math.max(...points.map(p => p[0])) - left;
                                                const height = Math.max(...points.map(p => p[1])) - top;
                                                
                                                // Convert to percentages (using standard image dimensions)
                                                const imageWidth = 5457;   
                                                const imageHeight = 4699;  
                                                let topPercent = (top / imageHeight) * 100;
                                                const leftPercent = (left / imageWidth) * 100;
                                                const widthPercent = (width / imageWidth) * 100;
                                                const heightPercent = (height / imageHeight) * 100;
                                                
                                                // Page-specific coordinate adjustments
                                                if (pageId === 'bb749.1.ms.01') {
                                                    // Title page needs adjustment - move up by ~3 lines
                                                    topPercent = Math.max(0, topPercent - 3); // Adjust upward by ~3%, but not below 0
                                                }
                                                
                                                const lines = marginaliaZone.lg[0].l;
                                                const lineHeight = heightPercent / lines.length;
                                                
                                                lines.forEach((l, index) => {
                                                    let text = '';
                                                    if (l._ !== undefined) {
                                                        text = l._;
                                                    } else if (typeof l === 'string') {
                                                        text = l;
                                                    }
                                                    
                                                    if (text.trim()) {
                                                        // Find or create transcription for this specific image
                                                        let transcription = transcriptions.find(t => t.id === pageId);
                                                        if (!transcription) {
                                                            transcription = {
                                                                id: pageId,
                                                                image: `/images/${dbi}.300.jpg`,
                                                                textData: []
                                                            };
                                                            transcriptions.push(transcription);
                                                        }
                                                        
                                                        // Distribute lines vertically within the zone
                                                        const lineTop = topPercent + (index * lineHeight);
                                                        
                                                        // Determine marginalia type based on content and XML attributes
                                                        let type = 'note'; // default
                                                        const trimmedText = text.trim().toLowerCase();
                                                        
                                                        if (trimmedText.includes('contemptible') || trimmedText.includes('horrible') || 
                                                            trimmedText.includes('folly') || trimmedText.includes('dishonest')) {
                                                            type = 'criticism';
                                                        } else if (trimmedText.includes('read') || trimmedText.includes('chap') || 
                                                                  trimmedText.includes('bible') || trimmedText.includes('paine')) {
                                                            type = 'reference';
                                                        } else if (marginaliaZone.$.type && marginaliaZone.$.type.includes('deletion')) {
                                                            type = 'correction';
                                                        }
                                                        
                                                        transcription.textData.push({
                                                            text: text.trim(),
                                                            top: lineTop,
                                                            left: leftPercent,
                                                            width: widthPercent,
                                                            height: lineHeight,
                                                            type: type
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        }
                    });
            
                    console.log('Transcriptions extracted:', transcriptions);
                    callback(null, transcriptions);
                }
            }   
        }
    });
}
// Route for the main page
app.get('/', (req, res) => {
    // Read XML file (for this example, the XML is expected to be in 'example.xml')
    fs.readFile('BB749.1.ms.xml', 'utf8', (err, xmlData) => {
        if (err) {
            res.status(500).send('Error reading XML file');
            return;
        }

        // Parse the XML data
        parseXml(xmlData, (err, transcriptions) => {
            if (err) {
                res.status(500).send('Error parsing XML file');
                return;
            }

            // Generate HTML for each image with transcriptions
            const imagesHtml = transcriptions.map(t => {
                const transcriptionHtml = t.textData.map(td => 
                    `<div style="position: absolute; left: ${td.x}px; top: ${td.y}px;">${td.text}</div>`
                ).join('');

                console.log('Image URL:', `/images/${t.image}`); // Log the image URL

                return `
                    <div style="position: relative; margin-bottom: 20px;">
                        <img src="/images/${t.image}" alt="${t.id}" style="position: relative;">
                        ${transcriptionHtml}
                    </div>
                `;
            }).join('');

            // Send the HTML response
            res.send(`
                <html>
                    <head><title>Transcription Overlay</title></head>
                    <body>${imagesHtml}</body>
                </html>
            `);
        });
    });
});


