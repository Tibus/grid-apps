const fs = require('fs');

console.log("process", process.argv);

let content = fs.readFileSync(process.argv[2]).toString();

fs.writeFileSync(process.argv[3], "");
content.split("\n").forEach((file)=>{
    console.log("file", file);
    fs.existsSync(file) && fs.appendFileSync(process.argv[3], fs.readFileSync(file));
})

console.log("content", fs.readFileSync(process.argv[3]));