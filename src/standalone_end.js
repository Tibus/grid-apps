try{
    if(ClipperLib){
        self.ClipperLib = ClipperLib;
    }else{
        ClipperLib = self.ClipperLib;
    }
}catch(e){
    ClipperLib = self.ClipperLib;    
}

console.log("ClipperLib", ClipperLib && ClipperLib.version);
console.log("self.ClipperLib", self.ClipperLib && self.ClipperLib.version);

module.exports = self;