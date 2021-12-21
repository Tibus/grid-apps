


const ConsoleTool = function (){
  this.count = {};
  this.value = {};
  this.onlyOnce = {};
  this.giveTrueOnce= {};

  this.logCount = function (){
    console.log("----->>> START LOG COUNT <<<----")
    for(const key in this.count){
      console.log(`${key}: ${this.count[key]}`);
    }
    console.log("-----<<< END LOG COUNT >>>----")

  }

  this.logValue = function (){
    console.log("----->>> START LOG VALUE <<<----");
    for(const key in this.value){
      console.log(`${key}: ${this.value[key]}`);
    }
    console.log("-----<<< END LOG VALUE >>>----")
  }

  this.add = function (key){
    if(this.value[key]){
      this.count[key]++
    }else{
      this.count[key] = 1;
    }
  }

  this.storeOnce = function (key, value){
    if(!this.value[key]){
      this.value[key] = value;
    }
  }

  this.logOnce = function (key, value){
    if(!this.onlyOnce[key]){
      this.onlyOnce[key] = value;
      console.log(`${key}: `, value);
    }
  }

  this.log = function (key, value){
      console.log(`${key}: `, value);
  }

  this.conditionnalLog = function(condition , key , value){
    if(condition){
      console.log(`${key}: `, value);
    }
  }

  this.conditionnalLogOnce = function(condition , key , value){
    if(!this.onlyOnce[key]){
      this.onlyOnce[key] = value;
      this.conditionnalLog(condition, key, value);
    }
  }

  this.onlyTrueOnce = function (key){
    if(!this.giveTrueOnce[key]){
      this.giveTrueOnce[key] = true;
      return true;
    }
    return false;
  }
  return this;
}();


module.exports = ConsoleTool;