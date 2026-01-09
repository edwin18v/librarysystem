const fs = require('fs');
const pngToIco = require('png-to-ico');

// Helper to handle ESM default export if present
const convert = pngToIco.default || pngToIco;

const source = 'library_icon_user.png'; // User provided image
const target = 'public/favicon.ico'; // Overwrite

convert(source)
    .then(buf => {
        fs.writeFileSync(target, buf);
        console.log('Converted to public/favicon.ico successfully');
    })
    .catch(error => {
        console.error('Error converting to ico:', error);
    });
