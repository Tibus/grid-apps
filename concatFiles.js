const fs = require('fs');

let content = fs.readFileSync(process.argv[2]).toString();

fs.writeFileSync(process.argv[3], "");
content.split("\n").forEach((file)=>{
    fs.existsSync(file) && fs.appendFileSync(process.argv[3], fs.readFileSync(file));
})