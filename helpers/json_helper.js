const fs = require('fs');
const path = require('path');

module.exports = {
    readJson: function(fileName) {
        let jsonPath = path.join('db', fileName);
        let jsonString = fs.readFileSync(jsonPath, 'utf8');
        return JSON.parse(jsonString);
    },

    writeJson: function(fileName, data) {
        let jsonPath = path.join('db', fileName);
        fs.writeFileSync(jsonPath, data);
    },

    write: function(fileName, data) {
        let filePath = path.join('db', fileName);
        fs.writeFile(filePath, data, {flag: 'a'}, (err) => {})
    }
};