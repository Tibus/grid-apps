const fs = require('fs');

console.log("process", process.argv);

let content = fs.readFileSync(process.argv[2]).toString();

fs.writeFileSync(process.argv[3], "");
let files = content.split(/\r?\n/);
for(let i in files){

    if(files[i].trim() !== ""){
        if(fs.existsSync(files[i])){
            fs.appendFileSync(process.argv[3],
`
//---------------------------------
//----- Concat : ${files[i]}
//---------------------------------

`);
            fs.appendFileSync(process.argv[3], fs.readFileSync(files[i]));
        }else{
          console.log(`${files[i]} not found`);
        }
    }
}
