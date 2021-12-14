const fs = require('fs');

console.log("process", process.argv);

let content = fs.readFileSync(process.argv[2]).toString();

fs.writeFileSync(process.argv[3], "");
let files = content.split(/\r?\n/);
for(let i in files){
    //console.log("file", files[i], fs.existsSync(files[i]));

    fs.existsSync(files[i]) && fs.appendFileSync(process.argv[3], fs.readFileSync(files[i]));
}