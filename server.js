const express = require('express');
const fs = require('fs');
const xml2js = require('xml2js');
const app = express();
const port = process.env.PORT
const path = require('path');

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve static files from the 'images' directory
app.use('/images', express.static(path.join(__dirname, 'images')));

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
                    const transcriptions = desc
                        .filter(Boolean)
                        .map(line => {
                            if (line && line.phystext && line.phystext[0] && line.phystext[0].zone) {
                                const zone = line.phystext[0].zone[0];
                                if (zone.zone && zone.zone[0] && zone.zone[0].lg && zone.zone[0].lg[0]) {
                                    const lg = zone.zone[0].lg[0];
                                    const dbi = result.bad.objdesc[0].desc[0].$ && result.bad.objdesc[0].desc[0].$.dbi ? result.bad.objdesc[0].desc[0].$.dbi : result.bad.$.id;
                                    const transcription = {
                                        id: result.bad.$.id,
                                        image: `${dbi}.300.jpg`,
                                        textData: []
                                    };
                                    if (lg.l && Array.isArray(lg.l)) {
                                        lg.l.forEach(l => {
                                            console.log('Processing line:', l);
                                            if (zone.$ && zone.$.points) {
                                                const points = zone.$.points.split(' ').map(point => point.split(',').map(Number));
                                                const top = Math.min(points[0][1], points[1][1], points[2][1], points[3][1]);
                                                const left = Math.min(points[0][0], points[1][0], points[2][0], points[3][0]);
                                                const width = Math.max(points[0][0], points[1][0], points[2][0], points[3][0]) - left;
                                                const height = Math.max(points[0][1], points[1][1], points[2][1], points[3][1]) - top;
                                                if (l._ !== undefined) {
                                                    transcription.textData.push({
                                                        text: l._,
                                                        top,
                                                        left,
                                                        width,
                                                        height
                                                    });
                                                } else if (l !== undefined) {
                                                    transcription.textData.push({
                                                        text: l,
                                                        top,
                                                        left,
                                                        width,
                                                        height
                                                    });
                                                } else {
                                                    console.log('No text data found for line:', l);
                                                }
                                            } else {
                                                console.log('No points data found for zone:', zone);
                                            }
                                        });
                                    }
                                    return transcription;
                                }    
                            }
                        })
                        .filter(Boolean);
            
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


